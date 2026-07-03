import { v } from 'convex/values';

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  type QueryCtx,
} from './_generated/server';
import { blockedUserIds, isNameAllowed, purgeLeagueReports, purgeUser } from './moderationLib';

async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
    .unique();
}

// ===========================================================================
// BLOCAGE (public, authentifié)
// ===========================================================================

// Bloque un joueur : masquage réciproque + supprime toute relation d'amitié (R2).
export const block = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const me = await currentUser(ctx);
    if (!me) throw new Error('Non authentifié');
    if (me._id === userId) throw new Error('Impossible de se bloquer soi-même');
    const target = await ctx.db.get(userId);
    if (!target) throw new Error('Utilisateur introuvable');

    // Idempotent : si déjà bloqué, ne rien faire.
    const existing = await ctx.db
      .query('blocks')
      .withIndex('by_blocker_blocked', (q) =>
        q.eq('blockerId', me._id).eq('blockedId', userId),
      )
      .unique();
    if (existing) return { ok: true };

    // Bloquer = ne plus être amis : supprimer les relations `friends` dans les 2 sens.
    const sent = await ctx.db
      .query('friends')
      .withIndex('by_user', (q) => q.eq('userId', me._id))
      .collect();
    for (const f of sent) if (f.friendId === userId) await ctx.db.delete(f._id);
    const received = await ctx.db
      .query('friends')
      .withIndex('by_friend', (q) => q.eq('friendId', me._id))
      .collect();
    for (const f of received) if (f.userId === userId) await ctx.db.delete(f._id);

    await ctx.db.insert('blocks', {
      blockerId: me._id,
      blockedId: userId,
      createdAt: Date.now(),
    });
    return { ok: true };
  },
});

// Débloque un joueur (ne restaure PAS l'amitié).
export const unblock = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const me = await currentUser(ctx);
    if (!me) throw new Error('Non authentifié');
    const existing = await ctx.db
      .query('blocks')
      .withIndex('by_blocker_blocked', (q) =>
        q.eq('blockerId', me._id).eq('blockedId', userId),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

// Mes comptes bloqués (pour l'écran de gestion « Comptes bloqués »).
export const myBlocks = query({
  args: {},
  handler: async (ctx) => {
    const me = await currentUser(ctx);
    if (!me) return [];
    const rows = await ctx.db
      .query('blocks')
      .withIndex('by_blocker', (q) => q.eq('blockerId', me._id))
      .collect();
    const out = [];
    for (const b of rows) {
      const u = await ctx.db.get(b.blockedId);
      if (u) {
        out.push({
          blockId: b._id,
          userId: u._id,
          username: u.username,
          avatarUrl: u.avatarUrl,
          createdAt: b.createdAt,
        });
      }
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// ===========================================================================
// SIGNALEMENT (public, authentifié)
// ===========================================================================

export const report = mutation({
  args: {
    targetType: v.union(v.literal('user'), v.literal('league')),
    targetUserId: v.optional(v.id('users')),
    targetLeagueId: v.optional(v.id('leagues')),
    reason: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, { targetType, targetUserId, targetLeagueId, reason, details }) => {
    const me = await currentUser(ctx);
    if (!me) throw new Error('Non authentifié');

    if (targetType === 'user') {
      if (!targetUserId) throw new Error('Cible manquante');
      if (targetUserId === me._id) throw new Error('Impossible de se signaler soi-même');
      if (!(await ctx.db.get(targetUserId))) throw new Error('Utilisateur introuvable');
    } else {
      if (!targetLeagueId) throw new Error('Cible manquante');
      if (!(await ctx.db.get(targetLeagueId))) throw new Error('Ligue introuvable');
    }

    // Anti-spam : un seul signalement `pending` par (rapporteur, cible).
    const mine = await ctx.db
      .query('reports')
      .withIndex('by_reporter', (q) => q.eq('reporterId', me._id))
      .collect();
    const dup = mine.find(
      (r) =>
        r.status === 'pending' &&
        (targetType === 'user'
          ? r.targetUserId === targetUserId
          : r.targetLeagueId === targetLeagueId),
    );
    if (dup) return { ok: true, already: true };

    await ctx.db.insert('reports', {
      reporterId: me._id,
      targetType,
      targetUserId,
      targetLeagueId,
      reason,
      details,
      status: 'pending',
      createdAt: Date.now(),
    });
    return { ok: true, already: false };
  },
});

// ===========================================================================
// ADMIN — fonctions INTERNAL (non exposées au client). À exécuter par l'éditeur
// via la CLI Convex, ex. `npx convex run moderation:listReports`.
// ===========================================================================

// Liste les signalements en attente, enrichis (rapporteur + cible lisible).
export const listReports = internalQuery({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query('reports')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect();
    const out = [];
    for (const r of pending) {
      const reporter = await ctx.db.get(r.reporterId);
      let target = '';
      if (r.targetType === 'user' && r.targetUserId) {
        const u = await ctx.db.get(r.targetUserId);
        target = u ? `@${u.username} [${u._id}]` : `user ${r.targetUserId} (supprimé)`;
      } else if (r.targetType === 'league' && r.targetLeagueId) {
        const l = await ctx.db.get(r.targetLeagueId);
        target = l ? `ligue "${l.name}" [${l._id}]` : `ligue ${r.targetLeagueId} (supprimée)`;
      }
      out.push({
        reportId: r._id,
        createdAt: r.createdAt,
        reporter: reporter ? `@${reporter.username}` : '?',
        type: r.targetType,
        target,
        reason: r.reason,
        details: r.details ?? '',
      });
    }
    return out.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Marque un signalement comme traité ou rejeté.
export const resolveReport = internalMutation({
  args: {
    reportId: v.id('reports'),
    status: v.union(v.literal('reviewed'), v.literal('dismissed')),
  },
  handler: async (ctx, { reportId, status }) => {
    await ctx.db.patch(reportId, { status });
    return { ok: true };
  },
});

// Bannit un joueur : purge toutes ses données (même cascade que l'auto-suppression).
// NB : le compte Clerk (auth) doit être supprimé À LA MAIN dans le dashboard Clerk.
export const banUser = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const u = await ctx.db.get(userId);
    if (!u) return { ok: false, reason: 'introuvable' };
    const username = u.username;
    await purgeUser(ctx, userId);
    return { ok: true, banned: username };
  },
});

// Renomme une ligue (repasse par le filtre de mots).
export const renameLeague = internalMutation({
  args: { leagueId: v.id('leagues'), name: v.string() },
  handler: async (ctx, { leagueId, name }) => {
    const clean = name.trim().slice(0, 40);
    if (clean.length < 2) throw new Error('Nom trop court');
    if (!isNameAllowed(clean)) throw new Error("Ce nom n'est pas autorisé.");
    await ctx.db.patch(leagueId, { name: clean });
    return { ok: true };
  },
});

// Supprime une ligue et ses adhésions + logo.
export const deleteLeague = internalMutation({
  args: { leagueId: v.id('leagues') },
  handler: async (ctx, { leagueId }) => {
    const league = await ctx.db.get(leagueId);
    if (!league) return { ok: false };
    const members = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', leagueId))
      .collect();
    for (const m of members) await ctx.db.delete(m._id);
    if (league.logoId) {
      try {
        await ctx.storage.delete(league.logoId);
      } catch {
        /* déjà supprimé */
      }
    }
    await purgeLeagueReports(ctx, leagueId);
    await ctx.db.delete(leagueId);
    return { ok: true };
  },
});
