import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { internalMutation, query, type QueryCtx } from './_generated/server';

const REWARD_AMOUNT = 20; // jetons par pub (autoritatif serveur, indépendant de la config AdMob)
const DAILY_CAP = 3; // pubs récompensées max par jour calendaire

async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
    .unique();
}

// Début du jour CALENDAIRE (UTC) en ms — base du quota « 3/jour ».
function startOfDayUTC(now: number): number {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Pubs encore disponibles aujourd'hui (pour l'UI : grise le bouton à 0).
export const adRewardsRemaining = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return 0;
    const since = startOfDayUTC(Date.now());
    const rows = await ctx.db
      .query('adRewards')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    const today = rows.filter((r) => r.createdAt >= since).length;
    return Math.max(0, DAILY_CAP - today);
  },
});

// Crédite la récompense APRÈS vérification SSV (appelée UNIQUEMENT par l'action Node
// `adsNode.verifyAndCredit`, jamais par le client). Idempotent (transactionId) + plafonné.
export const creditReward = internalMutation({
  args: { userId: v.string(), transactionId: v.string() },
  handler: async (ctx, { userId, transactionId }) => {
    // Idempotence : reward déjà traité (rejeu du callback) → ne rien faire.
    const dup = await ctx.db
      .query('adRewards')
      .withIndex('by_transaction', (q) => q.eq('transactionId', transactionId))
      .unique();
    if (dup) return { credited: false, reason: 'duplicate' };

    // `userId` provient du SSV SIGNÉ ; format d'id potentiellement invalide → get protégé.
    let user;
    try {
      user = await ctx.db.get(userId as Id<'users'>);
    } catch {
      return { credited: false, reason: 'bad_user' };
    }
    if (!user) return { credited: false, reason: 'no_user' };

    // Quota du jour calendaire.
    const now = Date.now();
    const since = startOfDayUTC(now);
    const rows = await ctx.db
      .query('adRewards')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    if (rows.filter((r) => r.createdAt >= since).length >= DAILY_CAP) {
      return { credited: false, reason: 'quota' };
    }

    await ctx.db.patch(user._id, { flames: user.flames + REWARD_AMOUNT });
    await ctx.db.insert('flameTransactions', {
      userId: user._id,
      amount: REWARD_AMOUNT,
      reason: 'ad_reward',
      refId: transactionId,
      createdAt: now,
    });
    await ctx.db.insert('adRewards', {
      userId: user._id,
      transactionId,
      amount: REWARD_AMOUNT,
      createdAt: now,
    });
    return { credited: true };
  },
});
