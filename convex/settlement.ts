import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { isKnockoutRound } from './rounds';

// Cœur de la résolution : règle tous les paris `pending` d'un match terminé.
// Idempotent (ne touche que les paris `pending`) → un 2e appel ne re-paie pas.
//
// Règle bookmaker : on tranche au TEMPS RÉGLEMENTAIRE (90'). En phase finale, le score 90' =
// `regHomeScore/regAwayScore` (API-Football `score.fulltime`) → prolongation et tirs au but
// n'entrent JAMAIS en jeu (marchés 1X2 / +-2,5 / BTTS / score exact). En poule, pas de
// prolongation possible : le score final EST le score 90'. Tant que le score 90' d'un match KO
// n'est pas encore récupéré (enrichissement API-Football), on n'règle pas (le cron réessaie).
async function settleBetsForMatch(ctx: MutationCtx, match: Doc<'matches'>): Promise<number> {
  const knockout = isKnockoutRound(match.round);
  const homeScore = knockout ? match.regHomeScore : match.homeScore;
  const awayScore = knockout ? match.regAwayScore : match.awayScore;
  if (match.status !== 'finished' || homeScore === undefined || awayScore === undefined) {
    return 0;
  }

  const bets = await ctx.db
    .query('bets')
    .withIndex('by_match', (q) => q.eq('matchId', match._id))
    .collect();
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
          const actual = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
          legWon = leg.pick === actual;
          break;
        }
        case 'over_under_2_5': {
          legWon = leg.pick === (homeScore + awayScore > 2.5 ? 'over' : 'under');
          break;
        }
        case 'btts': {
          legWon = leg.pick === (homeScore > 0 && awayScore > 0 ? 'yes' : 'no');
          break;
        }
        case 'exact_score': {
          legWon = leg.pick === `${homeScore}-${awayScore}`;
          break;
        }
        default:
          legWon = false;
      }
      updatedLegs.push({ ...leg, result: (legWon ? 'won' : 'lost') as 'won' | 'lost' | 'void' });
      if (!legWon) betWon = false;
    }

    const payout = betWon ? bet.potentialPayout : 0;
    await ctx.db.patch(bet._id, {
      status: betWon ? 'won' : 'lost',
      legs: updatedLegs,
      payout,
      settledAt: now,
    });

    const user = await ctx.db.get(bet.userId);
    if (user) {
      if (betWon) {
        await ctx.db.patch(user._id, { flames: user.flames + payout });
        await ctx.db.insert('flameTransactions', {
          userId: user._id,
          amount: payout,
          reason: 'prediction_win',
          refId: bet._id,
          createdAt: now,
        });
      }
      const title = betWon ? 'Prono gagné ! 🪙' : 'Prono perdu 😢';
      const body = betWon
        ? `Félicitations ! Ton prono sur ${match.homeName} - ${match.awayName} est validé. Tu gagnes +${payout.toLocaleString('fr-FR')} 🪙 !`
        : `Dommage, ton prono sur ${match.homeName} - ${match.awayName} est perdant. Retente ta chance !`;
      await ctx.db.insert('notifications', {
        userId: user._id,
        kind: 'prediction_resolved',
        title,
        body,
        matchId: match._id,
        betId: bet._id,
        read: false,
        createdAt: now,
      });
    }
    resolvedCount++;
  }
  return resolvedCount;
}

// Appelé à la transition d'un match → finished (depuis l'ingestion).
export const settleMatch = internalMutation({
  args: { matchId: v.id('matches') },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error('Match introuvable');
    return { resolvedCount: await settleBetsForMatch(ctx, match) };
  },
});

// Filet de sécurité (cron) : rattrape TOUS les paris en attente sur des matchs déjà terminés
// (matchs finis avant que le settlement existe, ou échec ponctuel du trigger). Idempotent.
export const reconcilePending = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query('bets')
      .withIndex('by_status', (q) => q.eq('status', 'pending'))
      .collect();
    const matchIds = [...new Set(pending.map((b) => b.matchId))];

    let resolved = 0;
    let matchesSettled = 0;
    for (const matchId of matchIds) {
      const match = await ctx.db.get(matchId);
      if (!match) continue;
      const n = await settleBetsForMatch(ctx, match);
      if (n > 0) {
        resolved += n;
        matchesSettled++;
      }
    }
    return { pendingBets: pending.length, matchesSettled, resolved };
  },
});
