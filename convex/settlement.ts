import { v } from 'convex/values';

import { internalMutation } from './_generated/server';

export const settleMatch = internalMutation({
  args: { matchId: v.id('matches') },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error('Match introuvable');

    // On ne résout que si le match est terminé
    if (match.status !== 'finished') {
      return { resolvedCount: 0 };
    }

    if (match.homeScore === undefined || match.awayScore === undefined) {
      return { resolvedCount: 0 };
    }

    const homeScore = match.homeScore;
    const awayScore = match.awayScore;

    // Récupérer tous les paris pour ce match
    const bets = await ctx.db
      .query('bets')
      .withIndex('by_match', (q) => q.eq('matchId', matchId))
      .collect();

    // Filtrer les paris en attente
    const pendingBets = bets.filter((b) => b.status === 'pending');
    let resolvedCount = 0;
    const now = Date.now();

    for (const bet of pendingBets) {
      let betWon = true;
      const updatedLegs = [];

      for (const leg of bet.legs) {
        let legWon = false;

        switch (leg.market) {
          case 'result_1x2': {
            const actualResult =
              homeScore > awayScore
                ? 'home'
                : homeScore < awayScore
                  ? 'away'
                  : 'draw';
            legWon = leg.pick === actualResult;
            break;
          }
          case 'over_under_2_5': {
            const totalGoals = homeScore + awayScore;
            const actualResult = totalGoals > 2.5 ? 'over' : 'under';
            legWon = leg.pick === actualResult;
            break;
          }
          case 'btts': {
            const actualResult = homeScore > 0 && awayScore > 0 ? 'yes' : 'no';
            legWon = leg.pick === actualResult;
            break;
          }
          case 'exact_score': {
            const actualResult = `${homeScore}-${awayScore}`;
            legWon = leg.pick === actualResult;
            break;
          }
          default:
            legWon = false;
        }

        updatedLegs.push({
          ...leg,
          result: (legWon ? 'won' : 'lost') as 'won' | 'lost' | 'void',
        });

        if (!legWon) {
          betWon = false;
        }
      }

      const nextStatus = betWon ? 'won' : 'lost';
      const payout = betWon ? bet.potentialPayout : 0;

      // Mettre à jour le statut du pari et de ses jambes
      await ctx.db.patch(bet._id, {
        status: nextStatus,
        legs: updatedLegs,
        payout: payout,
        settledAt: now,
      });

      // Mettre à jour le solde et les points de l'utilisateur
      const user = await ctx.db.get(bet.userId);
      if (user) {
        if (betWon) {
          await ctx.db.patch(user._id, {
            flames: user.flames + payout,
            points: user.points + payout,
          });

          // Créer la transaction de gain de flammes
          await ctx.db.insert('flameTransactions', {
            userId: user._id,
            amount: payout,
            reason: 'prediction_win',
            refId: bet._id,
            createdAt: now,
          });
        }

        // Créer une notification in-app
        const title = betWon ? 'Prono gagné ! 🔥' : 'Prono perdu 😢';
        const body = betWon
          ? `Félicitations ! Ton prono sur le match ${match.homeName} - ${match.awayName} a été validé. Tu gagnes +${payout.toLocaleString('fr-FR')} 🔥 !`
          : `Dommage, ton prono sur le match ${match.homeName} - ${match.awayName} est perdant. Retente ta chance au prochain match !`;

        await ctx.db.insert('notifications', {
          userId: user._id,
          kind: 'prediction_resolved',
          title,
          body,
          matchId: match._id,
          read: false,
          createdAt: now,
        });
      }

      resolvedCount++;
    }

    return { resolvedCount };
  },
});
