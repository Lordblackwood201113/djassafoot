import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';

type Leg = { market: string; pick: string };

// Résultat d'une jambe sur le résultat final d'un match.
// Marché 1N2 : le NUL est payé sur la PARITÉ (score à la fin des prolongations) ; V1/V2 sont payés
// sur le RÉSULTAT FINAL — sur un match à élimination départagé aux tirs au but, `match.winner`
// (rempli par enrichPenalties) fait GAGNER aussi le pari sur l'équipe qualifiée.
function legResult(
  leg: Leg,
  homeScore: number,
  awayScore: number,
  winner: 'home' | 'away' | undefined,
): boolean {
  switch (leg.market) {
    case 'result_1x2': {
      const parity = homeScore === awayScore;
      if (leg.pick === 'draw') return parity;
      if (leg.pick === 'home') return homeScore > awayScore || (parity && winner === 'home');
      return homeScore < awayScore || (parity && winner === 'away'); // 'away'
    }
    case 'over_under_2_5':
      return leg.pick === (homeScore + awayScore > 2.5 ? 'over' : 'under');
    case 'btts':
      return leg.pick === (homeScore > 0 && awayScore > 0 ? 'yes' : 'no');
    case 'exact_score':
      return leg.pick === `${homeScore}-${awayScore}`;
    default:
      return false;
  }
}

// Cœur de la résolution : règle tous les paris `pending` d'un match terminé.
// Idempotent (ne touche que les paris `pending`) → un 2e appel ne re-paie pas.
async function settleBetsForMatch(ctx: MutationCtx, match: Doc<'matches'>): Promise<number> {
  if (match.status !== 'finished' || match.homeScore === undefined || match.awayScore === undefined) {
    return 0;
  }
  const homeScore = match.homeScore;
  const awayScore = match.awayScore;

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
      const legWon = legResult(leg, homeScore, awayScore, match.winner);
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

// Re-règle les paris DÉJÀ réglés d'un match dont le résultat a évolué APRÈS le règlement initial :
//  - H1 : `winner` (tirs au but) désormais connu → un pari V1/V2 sur l'équipe qualifiée passe
//    perdant → gagnant.
//  - L3 : score corrigé par la source autoritative (syncFixtures) après un règlement sur un score
//    « live » erroné.
// `creditOnly=true` (H1) : mode SÛR qui n'applique QUE les passages perdant→gagnant (crédite),
// jamais l'inverse → aucun débit / solde négatif. `creditOnly=false` (correction de score) :
// les deux sens sont appliqués (crédit OU reprise via une transaction `settlement_correction`).
// Idempotent : un 2e appel sur un état inchangé ne fait rien.
export async function resettleMatchBets(
  ctx: MutationCtx,
  match: Doc<'matches'>,
  creditOnly: boolean,
): Promise<number> {
  if (match.status !== 'finished' || match.homeScore === undefined || match.awayScore === undefined) {
    return 0;
  }
  const homeScore = match.homeScore;
  const awayScore = match.awayScore;
  const bets = await ctx.db
    .query('bets')
    .withIndex('by_match', (q) => q.eq('matchId', match._id))
    .collect();
  const now = Date.now();
  let corrected = 0;

  for (const bet of bets) {
    if (bet.status !== 'won' && bet.status !== 'lost') continue; // seulement les paris DÉJÀ réglés

    let betWon = true;
    const updatedLegs = [];
    for (const leg of bet.legs) {
      const legWon = legResult(leg, homeScore, awayScore, match.winner);
      updatedLegs.push({ ...leg, result: (legWon ? 'won' : 'lost') as 'won' | 'lost' | 'void' });
      if (!legWon) betWon = false;
    }
    const newStatus: 'won' | 'lost' = betWon ? 'won' : 'lost';
    if (newStatus === bet.status) continue; // issue inchangée
    if (creditOnly && newStatus !== 'won') continue; // mode sûr : on ne débite jamais

    const newPayout = betWon ? bet.potentialPayout : 0;
    const prevPayout = bet.payout ?? 0;
    const delta = newPayout - prevPayout; // > 0 crédit, < 0 reprise

    await ctx.db.patch(bet._id, {
      status: newStatus,
      legs: updatedLegs,
      payout: newPayout,
      settledAt: now,
    });

    const user = await ctx.db.get(bet.userId);
    if (user) {
      if (delta !== 0) {
        await ctx.db.patch(user._id, { flames: user.flames + delta });
        await ctx.db.insert('flameTransactions', {
          userId: user._id,
          amount: delta,
          reason: 'settlement_correction',
          refId: bet._id,
          createdAt: now,
        });
      }
      await ctx.db.insert('notifications', {
        userId: user._id,
        kind: 'prediction_resolved',
        title: 'Prono recalculé',
        body: betWon
          ? `Après le résultat final, ton prono sur ${match.homeName} - ${match.awayName} est GAGNANT : +${newPayout.toLocaleString('fr-FR')} 🪙 !`
          : `Après recalcul du résultat final, ton prono sur ${match.homeName} - ${match.awayName} est finalement perdant.`,
        matchId: match._id,
        betId: bet._id,
        read: false,
        createdAt: now,
      });
    }
    corrected++;
  }
  return corrected;
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

// Re-règlement d'un match dont le SCORE a été corrigé par la source autoritative (les 2 sens).
export const resettleMatch = internalMutation({
  args: { matchId: v.id('matches') },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (!match) return { corrected: 0 };
    return { corrected: await resettleMatchBets(ctx, match, false) };
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
