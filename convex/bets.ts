import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import {
  lambdasFor,
  marketOdds,
  oddsForLeg,
  strengthFromPoints,
  type Lambdas,
} from './oddsShared';

const MARKETS = ['result_1x2', 'over_under_2_5', 'btts', 'exact_score'] as const;
type Market = (typeof MARKETS)[number];

const round2 = (n: number) => Math.round(n * 100) / 100;

// λ du match à partir des points de poule des deux équipes.
async function lambdasForMatch(ctx: QueryCtx, match: Doc<'matches'>): Promise<Lambdas> {
  const rows = await ctx.db
    .query('standings')
    .withIndex('by_competition', (q) => q.eq('competitionApiId', match.competitionApiId))
    .collect();
  const pts: Record<string, number> = {};
  for (const r of rows) if (r.teamApiId) pts[r.teamApiId] = r.points;
  const sHome = strengthFromPoints(match.homeTeamApiId ? pts[match.homeTeamApiId] : undefined);
  const sAway = strengthFromPoints(match.awayTeamApiId ? pts[match.awayTeamApiId] : undefined);
  return lambdasFor(sHome, sAway);
}

async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
    .unique();
}

// Cotes de tous les marchés d'un match (+ λ pour calculer le score exact côté client).
export const oddsForMatch = query({
  args: { matchId: v.id('matches') },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (!match) return null;
    const lambdas = await lambdasForMatch(ctx, match);
    return { ...marketOdds(lambdas), lambdas, status: match.status, kickoff: match.kickoff };
  },
});

// Paris de l'utilisateur courant sur un match donné.
export const forMatch = query({
  args: { matchId: v.id('matches') },
  handler: async (ctx, { matchId }) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    const bets = await ctx.db
      .query('bets')
      .withIndex('by_match', (q) => q.eq('matchId', matchId))
      .collect();
    return bets.filter((b) => b.userId === user._id);
  },
});

// Tous mes paris (pour l'onglet « Mes pronos »), avec un résumé du match.
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    const bets = await ctx.db
      .query('bets')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect();
    return Promise.all(
      bets.map(async (b) => {
        const m = await ctx.db.get(b.matchId);
        return {
          ...b,
          match: m
            ? {
                homeName: m.homeName,
                awayName: m.awayName,
                homeBadgeUrl: m.homeBadgeUrl,
                awayBadgeUrl: m.awayBadgeUrl,
                kickoff: m.kickoff,
                status: m.status,
                homeScore: m.homeScore,
                awayScore: m.awayScore,
              }
            : null,
        };
      }),
    );
  },
});

// Pose un pari combiné : valide, recalcule les cotes (autoritatif), débite les flammes.
export const place = mutation({
  args: {
    matchId: v.id('matches'),
    stake: v.number(),
    legs: v.array(v.object({ market: v.string(), pick: v.string(), label: v.string() })),
  },
  handler: async (ctx, { matchId, stake, legs }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    const match = await ctx.db.get(matchId);
    if (!match) throw new Error('Match introuvable');
    if (match.status !== 'scheduled' || match.kickoff <= Date.now())
      throw new Error('Ce match a déjà commencé');
    if (legs.length === 0) throw new Error('Aucune sélection');
    if (!Number.isFinite(stake) || stake <= 0 || !Number.isInteger(stake))
      throw new Error('Mise invalide');
    if (stake > user.flames) throw new Error('Solde de flammes insuffisant');

    const lambdas = await lambdasForMatch(ctx, match);
    const seen = new Set<string>();
    const computed = legs.map((leg) => {
      if (!MARKETS.includes(leg.market as Market)) throw new Error(`Marché inconnu : ${leg.market}`);
      if (seen.has(leg.market)) throw new Error('Un seul choix par marché');
      seen.add(leg.market);
      return {
        market: leg.market as Market,
        pick: leg.pick,
        label: leg.label,
        odds: oddsForLeg(lambdas, leg.market, leg.pick),
      };
    });

    const totalOdds = round2(computed.reduce((p, x) => p * x.odds, 1));
    const potentialPayout = Math.round(stake * totalOdds);
    const now = Date.now();

    await ctx.db.patch(user._id, { flames: user.flames - stake });
    const betId = await ctx.db.insert('bets', {
      userId: user._id,
      matchId,
      legs: computed,
      stake,
      totalOdds,
      potentialPayout,
      status: 'pending',
      createdAt: now,
    });
    await ctx.db.insert('flameTransactions', {
      userId: user._id,
      amount: -stake,
      reason: 'prediction_stake',
      refId: betId,
      createdAt: now,
    });

    return { betId, totalOdds, potentialPayout, newBalance: user.flames - stake };
  },
});
