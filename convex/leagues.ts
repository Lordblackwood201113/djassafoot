import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';

async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
    .unique();
}

// Codes lisibles, sans caractères ambigus (0/O, 1/I).
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function makeCode(len = 6) {
  let s = '';
  for (let i = 0; i < len; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

async function uniqueCode(ctx: MutationCtx): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = makeCode();
    const existing = await ctx.db
      .query('leagues')
      .withIndex('by_code', (q) => q.eq('code', code))
      .unique();
    if (!existing) return code;
  }
  return makeCode(8);
}

// Score de ligue d'un membre = P&L de ses paris RÉGLÉS depuis son entrée.
// On ne retranche la mise QUE si le pari est perdu. Un pari en attente (résultat encore
// inconnu) ne compte pas → pas de solde négatif tant qu'aucun pari n'est réellement perdu.
async function memberScore(ctx: QueryCtx, userId: Id<'users'>, since: number): Promise<number> {
  const bets = await ctx.db
    .query('bets')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  let score = 0;
  for (const b of bets) {
    if (b.createdAt < since) continue; // uniquement les paris placés depuis l'entrée
    if (b.status === 'won') {
      score += (b.payout ?? b.potentialPayout) - b.stake; // bénéfice net (gain − mise)
    } else if (b.status === 'lost') {
      score -= b.stake; // mise perdue
    }
    // 'pending' / 'void' → 0 (on attend le résultat, rien n'est retranché)
  }
  return score;
}

// Crée une ligue (le créateur en devient le 1er membre).
export const create = mutation({
  args: { name: v.string(), emoji: v.optional(v.string()), logoId: v.optional(v.id('_storage')) },
  handler: async (ctx, { name, emoji, logoId }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    const clean = name.trim().slice(0, 40);
    if (clean.length < 2) throw new Error('Nom de ligue trop court');
    const now = Date.now();
    const code = await uniqueCode(ctx);
    const leagueId = await ctx.db.insert('leagues', {
      name: clean,
      emoji: emoji || undefined,
      logoId: logoId || undefined,
      code,
      ownerId: user._id,
      createdAt: now,
    });
    await ctx.db.insert('leagueMembers', { leagueId, userId: user._id, joinedAt: now });
    return { leagueId, code };
  },
});

// Fournit une URL d'upload signée (le client y POST l'image, récupère un storageId).
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    return await ctx.storage.generateUploadUrl();
  },
});

// Définit le logo d'une ligue à partir d'une image importée (créateur uniquement).
export const setLogo = mutation({
  args: { leagueId: v.id('leagues'), storageId: v.id('_storage') },
  handler: async (ctx, { leagueId, storageId }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    const league = await ctx.db.get(leagueId);
    if (!league) throw new Error('Ligue introuvable');
    if (league.ownerId !== user._id) throw new Error('Seul le créateur peut changer le logo');
    if (league.logoId && league.logoId !== storageId) {
      try {
        await ctx.storage.delete(league.logoId); // évite les fichiers orphelins
      } catch {
        /* déjà supprimé */
      }
    }
    await ctx.db.patch(leagueId, { logoId: storageId });
    return { ok: true };
  },
});

// Retire le logo importé → retour à l'emoji (créateur uniquement).
export const removeLogo = mutation({
  args: { leagueId: v.id('leagues') },
  handler: async (ctx, { leagueId }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    const league = await ctx.db.get(leagueId);
    if (!league) throw new Error('Ligue introuvable');
    if (league.ownerId !== user._id) throw new Error('Seul le créateur peut changer le logo');
    if (league.logoId) {
      try {
        await ctx.storage.delete(league.logoId);
      } catch {
        /* déjà supprimé */
      }
    }
    await ctx.db.patch(leagueId, { logoId: undefined });
    return { ok: true };
  },
});

// Rejoint une ligue via son code (insensible à la casse).
export const joinByCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    const norm = code.trim().toUpperCase();
    const league = await ctx.db
      .query('leagues')
      .withIndex('by_code', (q) => q.eq('code', norm))
      .unique();
    if (!league) throw new Error('Code de ligue invalide');
    const existing = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league_user', (q) => q.eq('leagueId', league._id).eq('userId', user._id))
      .unique();
    if (!existing) {
      await ctx.db.insert('leagueMembers', {
        leagueId: league._id,
        userId: user._id,
        joinedAt: Date.now(),
      });
    }
    return { leagueId: league._id };
  },
});

// Quitte une ligue. Si le créateur part : transfert au plus ancien membre, sinon suppression.
export const leave = mutation({
  args: { leagueId: v.id('leagues') },
  handler: async (ctx, { leagueId }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    const membership = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league_user', (q) => q.eq('leagueId', leagueId).eq('userId', user._id))
      .unique();
    if (!membership) return { left: false };
    await ctx.db.delete(membership._id);

    const league = await ctx.db.get(leagueId);
    if (league && league.ownerId === user._id) {
      const rest = await ctx.db
        .query('leagueMembers')
        .withIndex('by_league', (q) => q.eq('leagueId', leagueId))
        .collect();
      if (rest.length === 0) {
        if (league.logoId) {
          try {
            await ctx.storage.delete(league.logoId);
          } catch {
            /* déjà supprimé */
          }
        }
        await ctx.db.delete(leagueId);
      } else {
        const next = rest.sort((a, b) => a.joinedAt - b.joinedAt)[0];
        await ctx.db.patch(leagueId, { ownerId: next.userId });
      }
    }
    return { left: true };
  },
});

// Supprime la ligue (créateur uniquement).
export const remove = mutation({
  args: { leagueId: v.id('leagues') },
  handler: async (ctx, { leagueId }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    const league = await ctx.db.get(leagueId);
    if (!league) return { removed: false };
    if (league.ownerId !== user._id) throw new Error('Seul le créateur peut supprimer la ligue');
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
    await ctx.db.delete(leagueId);
    return { removed: true };
  },
});

// Exclut un membre (créateur uniquement).
export const kick = mutation({
  args: { leagueId: v.id('leagues'), userId: v.id('users') },
  handler: async (ctx, { leagueId, userId }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    const league = await ctx.db.get(leagueId);
    if (!league) throw new Error('Ligue introuvable');
    if (league.ownerId !== user._id) throw new Error('Seul le créateur peut exclure un membre');
    if (userId === user._id) throw new Error("Le créateur ne peut pas s'exclure");
    const membership = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league_user', (q) => q.eq('leagueId', leagueId).eq('userId', userId))
      .unique();
    if (membership) await ctx.db.delete(membership._id);
    return { kicked: true };
  },
});

// Mes ligues (avec mon score et le nb de membres).
export const myLeagues = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    const memberships = await ctx.db
      .query('leagueMembers')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    const out = [];
    for (const mem of memberships) {
      const league = await ctx.db.get(mem.leagueId);
      if (!league) continue;
      const members = await ctx.db
        .query('leagueMembers')
        .withIndex('by_league', (q) => q.eq('leagueId', league._id))
        .collect();
      out.push({
        _id: league._id,
        name: league.name,
        emoji: league.emoji,
        logoUrl: league.logoId ? await ctx.storage.getUrl(league.logoId) : null,
        code: league.code,
        isOwner: league.ownerId === user._id,
        memberCount: members.length,
        joinedAt: mem.joinedAt,
        myScore: await memberScore(ctx, user._id, mem.joinedAt),
      });
    }
    return out.sort((a, b) => b.joinedAt - a.joinedAt);
  },
});

// Détail d'une ligue : membres classés par score (bénéfice de pronos depuis l'entrée).
export const detail = query({
  args: { leagueId: v.id('leagues') },
  handler: async (ctx, { leagueId }) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    const league = await ctx.db.get(leagueId);
    if (!league) return null;
    const memberships = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', leagueId))
      .collect();
    if (!memberships.some((m) => m.userId === user._id)) return null; // réservé aux membres

    const rows = [];
    for (const mem of memberships) {
      const u = await ctx.db.get(mem.userId);
      if (!u) continue;
      rows.push({
        userId: u._id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        joinedAt: mem.joinedAt,
        score: await memberScore(ctx, u._id, mem.joinedAt),
        isOwner: league.ownerId === u._id,
        isMe: u._id === user._id,
      });
    }
    rows.sort((a, b) => b.score - a.score);
    return {
      _id: league._id,
      name: league.name,
      emoji: league.emoji,
      logoUrl: league.logoId ? await ctx.storage.getUrl(league.logoId) : null,
      code: league.code,
      isOwner: league.ownerId === user._id,
      memberCount: rows.length,
      members: rows,
    };
  },
});

// Aperçu d'une ligue via son code (écran « rejoindre par lien », avant d'avoir rejoint).
export const byCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const league = await ctx.db
      .query('leagues')
      .withIndex('by_code', (q) => q.eq('code', code.trim().toUpperCase()))
      .unique();
    if (!league) return null;
    const members = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', league._id))
      .collect();
    return {
      _id: league._id,
      name: league.name,
      emoji: league.emoji,
      logoUrl: league.logoId ? await ctx.storage.getUrl(league.logoId) : null,
      memberCount: members.length,
    };
  },
});
