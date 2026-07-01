import { v } from 'convex/values';

import { internalMutation } from './_generated/server';

// Migration ponctuelle — retire l'ancien champ `points` (score de classement)
// désormais remplacé par le classement au solde de jetons (`flames`).
//
// À lancer UNE fois après avoir déployé le schéma où `points` est optionnel :
//   npx convex run migrations:stripPoints
//
// Une fois exécutée (cleaned == 0 au 2e appel), on peut retirer définitivement
// `points` du schéma (schema.ts) puis supprimer ce fichier.
export const stripPoints = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    let cleaned = 0;
    for (const u of users) {
      if (u.points !== undefined) {
        await ctx.db.patch(u._id, { points: undefined });
        cleaned++;
      }
    }
    return { total: users.length, cleaned };
  },
});

// Outil admin : re-règle un pari sur un score donné (ex. corriger un règlement erroné).
// Idempotent : n'agit QUE si le pari est actuellement 'won' et devient 'lost' sur ce score.
// Bascule le pari en perdu (payout 0), retire les jetons crédités du solde, journalise une
// transaction de correction (trace), et corrige la notification « gagné ».
export const resettleBetOnScore = internalMutation({
  args: { betId: v.id('bets'), homeScore: v.number(), awayScore: v.number() },
  handler: async (ctx, { betId, homeScore, awayScore }) => {
    const bet = await ctx.db.get(betId);
    if (!bet) return { error: 'pari introuvable' };
    if (bet.status !== 'won') return { skipped: `statut actuel = ${bet.status}` };

    const legWon = (leg: { market: string; pick: string }): boolean => {
      switch (leg.market) {
        case 'result_1x2':
          return leg.pick === (homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw');
        case 'over_under_2_5':
          return leg.pick === (homeScore + awayScore > 2.5 ? 'over' : 'under');
        case 'btts':
          return leg.pick === (homeScore > 0 && awayScore > 0 ? 'yes' : 'no');
        case 'exact_score':
          return leg.pick === `${homeScore}-${awayScore}`;
        default:
          return false;
      }
    };
    const updatedLegs = bet.legs.map((l) => ({
      ...l,
      result: (legWon(l) ? 'won' : 'lost') as 'won' | 'lost' | 'void',
    }));
    if (updatedLegs.every((l) => l.result === 'won')) {
      return { skipped: 'toujours gagnant sur ce score' };
    }

    const credited = bet.payout ?? 0;
    const now = Date.now();
    await ctx.db.patch(betId, { status: 'lost', payout: 0, legs: updatedLegs, settledAt: now });

    const user = await ctx.db.get(bet.userId);
    let newBalance: number | null = null;
    if (user) {
      newBalance = user.flames - credited;
      await ctx.db.patch(user._id, { flames: newBalance });
      await ctx.db.insert('flameTransactions', {
        userId: user._id,
        amount: -credited,
        reason: 'settlement_correction',
        refId: betId,
        createdAt: now,
      });
    }

    const match = await ctx.db.get(bet.matchId);
    const notifs = (await ctx.db.query('notifications').collect()).filter(
      (n) => n.betId === betId && n.kind === 'prediction_resolved',
    );
    for (const n of notifs) {
      await ctx.db.patch(n._id, {
        title: 'Prono recalculé',
        body: `Ton prono sur ${match?.homeName ?? ''} - ${match?.awayName ?? ''} a été recalculé sur le score final (${homeScore}-${awayScore}) : il est perdant. Les ${credited.toLocaleString('fr-FR')} 🪙 crédités par erreur ont été retirés.`,
        read: false,
      });
    }

    return { user: user?.username, removed: credited, newBalance, notifsCorrigees: notifs.length };
  },
});
