import { v } from 'convex/values';

import { mutation, query, type QueryCtx } from './_generated/server';

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
      const nextName = identity.nickname ?? identity.name ?? existing.username;
      if (nextName !== existing.username || identity.pictureUrl !== existing.avatarUrl) {
        await ctx.db.patch(existing._id, {
          username: nextName,
          avatarUrl: identity.pictureUrl,
        });
      }
      return existing._id;
    }

    const now = Date.now();
    const username =
      identity.nickname ??
      identity.name ??
      identity.email?.split('@')[0] ??
      'Joueur';

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
    if (me && me._id !== userId) {
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

    return {
      _id: u._id,
      username: u.username,
      avatarUrl: u.avatarUrl,
      flames: u.flames,
      streak: u.streak,
      createdAt: u.createdAt,
      betCount: bets.length,
      wonCount,
      isMe: me?._id === userId,
      relationship,
      relationshipId,
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
    const uid = user._id;
    const purge = async (docs: { _id: any }[]) => {
      for (const d of docs) await ctx.db.delete(d._id);
    };

    // Ligues possédées : si d'autres joueurs y sont encore, on TRANSFÈRE la propriété au plus ancien
    // membre restant (cohérent avec `leagues.leave`) pour ne pas détruire la ligue des autres ;
    // sinon (j'en suis le seul membre) on supprime la ligue + son logo.
    const ownedLeagues = await ctx.db
      .query('leagues')
      .withIndex('by_owner', (q) => q.eq('ownerId', uid))
      .collect();
    for (const lg of ownedLeagues) {
      const members = await ctx.db
        .query('leagueMembers')
        .withIndex('by_league', (q) => q.eq('leagueId', lg._id))
        .collect();
      const others = members.filter((m) => m.userId !== uid);
      if (others.length === 0) {
        if (lg.logoId) {
          try {
            await ctx.storage.delete(lg.logoId);
          } catch {
            /* déjà supprimé */
          }
        }
        await ctx.db.delete(lg._id);
      } else {
        const next = others.sort((a, b) => a.joinedAt - b.joinedAt)[0];
        await ctx.db.patch(lg._id, { ownerId: next.userId });
      }
    }

    // Toutes mes adhésions (ligues transférées, ligues supprimées, ou ligues d'autres joueurs).
    await purge(
      await ctx.db.query('leagueMembers').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
    );
    await purge(await ctx.db.query('bets').withIndex('by_user', (q) => q.eq('userId', uid)).collect());
    await purge(
      await ctx.db.query('flameTransactions').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
    );
    await purge(
      await ctx.db.query('notifications').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
    );
    await purge(await ctx.db.query('friends').withIndex('by_user', (q) => q.eq('userId', uid)).collect());
    await purge(
      await ctx.db.query('friends').withIndex('by_friend', (q) => q.eq('friendId', uid)).collect(),
    );

    await ctx.db.delete(uid);
    return { ok: true };
  },
});
