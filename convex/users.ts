import { mutation, query } from './_generated/server';

const SIGNUP_BONUS = 500;

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
