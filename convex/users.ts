import { v } from 'convex/values';

import { mutation, query, type QueryCtx } from './_generated/server';
import { blockedUserIds, isNameAllowed, purgeUser } from './moderationLib';

const SIGNUP_BONUS = 500;

async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
    .unique();
}

// Lit l'utilisateur Convex lié à l'identité Clerk courante (réactif).
export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique();
  },
});

// Crée l'utilisateur au premier login (+ bonus d'inscription), ou le retourne s'il existe.
export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Non authentifié');

    const existing = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique();

    if (existing) {
      // Garde le profil à jour si Clerk a changé
      const rawNext = identity.nickname ?? identity.name ?? existing.username;
      // Filtre de mots : si le pseudo Clerk devient interdit, on GARDE l'ancien (pas de throw → login OK).
      const nextName = isNameAllowed(rawNext) ? rawNext : existing.username;
      if (nextName !== existing.username || identity.pictureUrl !== existing.avatarUrl) {
        await ctx.db.patch(existing._id, {
          username: nextName,
          avatarUrl: identity.pictureUrl,
        });
      }
      return existing._id;
    }

    const now = Date.now();
    const rawUsername =
      identity.nickname ??
      identity.name ??
      identity.email?.split('@')[0] ??
      'Joueur';
    // Filtre de mots : pseudo interdit → neutralisé (pas de throw, sinon on casse l'inscription).
    const username = isNameAllowed(rawUsername) ? rawUsername : 'Joueur';

    const userId = await ctx.db.insert('users', {
      tokenIdentifier: identity.subject,
      username,
      avatarUrl: identity.pictureUrl,
      flames: SIGNUP_BONUS,
      streak: 0,
      createdAt: now,
    });

    await ctx.db.insert('flameTransactions', {
      userId,
      amount: SIGNUP_BONUS,
      reason: 'signup_bonus',
      createdAt: now,
    });

    return userId;
  },
});

// Profil PUBLIC d'un joueur (pour consulter un autre utilisateur) + statut d'amitié avec moi.
export const publicProfile = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const u = await ctx.db.get(userId);
    if (!u) return null;
    const me = await currentUser(ctx);

    const bets = await ctx.db
      .query('bets')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    const wonCount = bets.filter((b) => b.status === 'won').length;

    let relationship: 'none' | 'pending_sent' | 'pending_received' | 'accepted' = 'none';
    let relationshipId: string | null = null;
    let iBlockedThem = false;
    let isBlocked = false;
    if (me && me._id !== userId) {
      // Blocage (2 sens) → aucune interaction d'ami exposée ; on marque si c'est MOI qui bloque.
      const blocked = await blockedUserIds(ctx, me._id);
      if (blocked.has(userId)) {
        isBlocked = true;
        const iBlocked = await ctx.db
          .query('blocks')
          .withIndex('by_blocker_blocked', (q) =>
            q.eq('blockerId', me._id).eq('blockedId', userId),
          )
          .unique();
        iBlockedThem = !!iBlocked;
      } else {
        const sent = await ctx.db
          .query('friends')
          .withIndex('by_user', (q) => q.eq('userId', me._id))
          .collect();
        const s = sent.find((f) => f.friendId === userId);
        if (s) {
          relationship = s.status === 'accepted' ? 'accepted' : 'pending_sent';
          relationshipId = s._id;
        } else {
          const received = await ctx.db
            .query('friends')
            .withIndex('by_friend', (q) => q.eq('friendId', me._id))
            .collect();
          const r = received.find((f) => f.userId === userId);
          if (r) {
            relationship = r.status === 'accepted' ? 'accepted' : 'pending_received';
            relationshipId = r._id;
          }
        }
      }
    }

    return {
      _id: u._id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      // Profil bloqué (2 sens) : stats neutralisées (le contenu réel — l'historique de
      // paris — est masqué séparément dans bets.forUser).
      flames: isBlocked ? 0 : u.flames,
      streak: isBlocked ? 0 : u.streak,
      createdAt: u.createdAt,
      betCount: isBlocked ? 0 : bets.length,
      wonCount: isBlocked ? 0 : wonCount,
      isMe: me?._id === userId,
      relationship,
      relationshipId,
      iBlockedThem,
      blocked: isBlocked,
    };
  },
});

// Supprime DÉFINITIVEMENT le compte : toutes les données Convex de l'utilisateur courant
// (paris, transactions, notifications, amitiés dans les 2 sens, ligues possédées + leurs membres +
// leur logo dans le storage, adhésions), puis l'enregistrement `users`. La suppression du compte
// Clerk (auth) est déclenchée côté client juste après. Exigé par Apple/Google (suppression in-app).
export const deleteMyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    // Cascade centralisée dans `moderationLib.purgeUser` (réutilisée par l'admin `banUser`).
    await purgeUser(ctx, user._id);
    return { ok: true };
  },
});
