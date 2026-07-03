import type { Id } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';

const REWARD_AMOUNT = 20; // jetons par pub (autoritatif serveur)
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

async function adRewardsToday(ctx: QueryCtx, userId: Id<'users'>): Promise<number> {
  const since = startOfDayUTC(Date.now());
  const rows = await ctx.db
    .query('adRewards')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  return rows.filter((r) => r.createdAt >= since).length;
}

// Pubs encore disponibles aujourd'hui (pour l'UI : grise le bouton à 0).
export const adRewardsRemaining = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return 0;
    return Math.max(0, DAILY_CAP - (await adRewardsToday(ctx, user._id)));
  },
});

// Crédite +20 jetons après qu'une pub récompensée a été REGARDÉE (callback client `EARNED_REWARD`).
// Plafond 3/jour calendaire appliqué CÔTÉ SERVEUR (autoritatif) → un client ne peut pas dépasser.
// Pas de SSV : jetons 100 % virtuels, le plafond borne tout abus (cf. story 1-4).
export const claimAdReward = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');

    const today = await adRewardsToday(ctx, user._id);
    if (today >= DAILY_CAP) return { credited: false, reason: 'quota' as const };

    const now = Date.now();
    await ctx.db.patch(user._id, { flames: user.flames + REWARD_AMOUNT });
    await ctx.db.insert('flameTransactions', {
      userId: user._id,
      amount: REWARD_AMOUNT,
      reason: 'ad_reward',
      createdAt: now,
    });
    await ctx.db.insert('adRewards', { userId: user._id, amount: REWARD_AMOUNT, createdAt: now });
    return { credited: true as const, remaining: DAILY_CAP - (today + 1) };
  },
});
