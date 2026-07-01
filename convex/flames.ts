import { mutation, query, type QueryCtx } from './_generated/server';

// Bonus quotidien FIXE (économie maîtrisée : pas de multiplicateur qui inflate les jetons).
const DAILY_BONUS = 20;

async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
    .unique();
}

// Récupère l'historique des transactions de jetons de l'utilisateur connecté
export const myTransactions = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query('flameTransactions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect();
  },
});

// Réclame le bonus quotidien
export const claimDailyBonus = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Non authentifié');

    const user = await ctx.db
      .query('users')
      .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
      .unique();

    if (!user) throw new Error('Utilisateur non trouvé');

    const now = Date.now();
    // 23 heures au lieu de 24 pour éviter le décalage de l'heure de réclamation au fil des jours.
    const minIntervalMs = 23 * 60 * 60 * 1000;
    // 48 heures maximum pour maintenir la série (streak).
    const maxIntervalMs = 48 * 60 * 60 * 1000;

    let newStreak = 1;

    if (user.lastDailyBonusAt) {
      const diff = now - user.lastDailyBonusAt;
      if (diff < minIntervalMs) {
        throw new Error('Bonus déjà réclamé. Reviens plus tard !');
      } else if (diff < maxIntervalMs) {
        newStreak = user.streak + 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    // Montant fixe quel que soit le streak (le streak reste affiché, mais ne gonfle plus le gain).
    const bonusAmount = DAILY_BONUS;

    // Mettre à jour l'utilisateur (solde + streak + date du dernier bonus)
    await ctx.db.patch(user._id, {
      flames: user.flames + bonusAmount,
      streak: newStreak,
      lastDailyBonusAt: now,
    });

    // Insérer la transaction
    await ctx.db.insert('flameTransactions', {
      userId: user._id,
      amount: bonusAmount,
      reason: 'daily_bonus',
      createdAt: now,
    });

    return {
      bonusAmount,
      streak: newStreak,
      nextClaimAvailableAt: now + minIntervalMs,
    };
  },
});
