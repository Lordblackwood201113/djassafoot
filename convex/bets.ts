import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';
import { validateLegs } from './betRules';
import {
  exactOdds,
  lambdasFor,
  marketOdds,
  strengthFromPoints,
  type Lambdas,
  type MarketOdds,
} from './oddsShared';

const MARKETS = ['result_1x2', 'over_under_2_5', 'btts', 'exact_score'] as const;
type Market = (typeof MARKETS)[number];

const round2 = (n: number) => Math.round(n * 100) / 100;
// Marge maison appliquée aux cotes RÉELLES (Betfair = sans marge) → économie de jetons saine.
const REAL_MARGIN = 0.95;
const withMargin = (x?: number) => (x ? Math.max(1.04, round2(x * REAL_MARGIN)) : undefined);

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

// Cotes effectives d'un match : vraies cotes (odds-api.io) marché par marché si dispo, sinon Poisson.
async function resolveOdds(
  ctx: QueryCtx,
  match: Doc<'matches'>,
): Promise<{ odds: MarketOdds; lambdas: Lambdas; source: 'odds-api.io' | 'poisson' }> {
  const lambdas = await lambdasForMatch(ctx, match);
  const base = marketOdds(lambdas); // Poisson (déjà margé)
  const row = await ctx.db
    .query('odds')
    .withIndex('by_match', (q) => q.eq('matchId', match._id))
    .unique();
  if (!row) return { odds: base, lambdas, source: 'poisson' };
  return {
    odds: {
      home: withMargin(row.home) ?? base.home,
      draw: withMargin(row.draw) ?? base.draw,
      away: withMargin(row.away) ?? base.away,
      over: withMargin(row.over) ?? base.over,
      under: withMargin(row.under) ?? base.under,
      bttsYes: withMargin(row.bttsYes) ?? base.bttsYes,
      bttsNo: withMargin(row.bttsNo) ?? base.bttsNo,
    },
    lambdas,
    source: 'odds-api.io',
  };
}

// Cote d'un leg depuis les cotes effectives (score exact toujours via Poisson/λ).
function legOdds(o: MarketOdds, lambdas: Lambdas, market: string, pick: string): number {
  switch (market) {
    case 'result_1x2':
      return pick === 'home' ? o.home : pick === 'away' ? o.away : o.draw;
    case 'over_under_2_5':
      return pick === 'over' ? o.over : o.under;
    case 'btts':
      return pick === 'yes' ? o.bttsYes : o.bttsNo;
    case 'exact_score': {
      const [h, a] = pick.split('-').map((n) => parseInt(n, 10));
      return exactOdds(lambdas, h || 0, a || 0);
    }
    default:
      return 1;
  }
}

// Cotes de tous les marchés d'un match (+ λ pour calculer le score exact côté client).
export const oddsForMatch = query({
  args: { matchId: v.id('matches') },
  handler: async (ctx, { matchId }) => {
    const match = await ctx.db.get(matchId);
    if (!match) return null;
    const r = await resolveOdds(ctx, match);
    return { ...r.odds, lambdas: r.lambdas, source: r.source, status: match.status, kickoff: match.kickoff };
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

// Un pari précis (écran de résultat, ouvert depuis l'historique ou une notification).
export const byId = query({
  args: { id: v.id('bets') },
  handler: async (ctx, { id }) => {
    const user = await currentUser(ctx);
    if (!user) return null;
    const bet = await ctx.db.get(id);
    if (!bet || bet.userId !== user._id) return null;
    const m = await ctx.db.get(bet.matchId);
    return {
      ...bet,
      shareImageUrl: bet.shareImageId ? await ctx.storage.getUrl(bet.shareImageId) : null,
      match: m
        ? {
            homeName: m.homeName,
            awayName: m.awayName,
            kickoff: m.kickoff,
            status: m.status,
            homeScore: m.homeScore,
            awayScore: m.awayScore,
            homePenalty: m.homePenalty,
            awayPenalty: m.awayPenalty,
          }
        : null,
    };
  },
});

// Données PUBLIQUES d'un pari pour le partage réseaux (carte OG dynamique). PAS d'auth :
// l'id d'un pari est non devinable et l'utilisateur choisit de partager ce résultat.
// Renvoie uniquement l'affichage (aucune donnée sensible / interne / d'autrui).
export const publicShare = query({
  args: { id: v.id('bets') },
  handler: async (ctx, { id }) => {
    const bet = await ctx.db.get(id);
    if (!bet) return null;
    const m = await ctx.db.get(bet.matchId);
    const u = await ctx.db.get(bet.userId);
    return {
      status: bet.status,
      payout: bet.payout ?? bet.potentialPayout ?? 0,
      stake: bet.stake,
      legs: bet.legs.map((l) => ({ label: l.label, result: l.result ?? null })),
      home: m?.homeName ?? '',
      away: m?.awayName ?? '',
      homeScore: m?.homeScore ?? null,
      awayScore: m?.awayScore ?? null,
      homePenalty: m?.homePenalty ?? null,
      awayPenalty: m?.awayPenalty ?? null,
      matchStatus: m?.status ?? 'scheduled',
      username: u?.username ?? null,
      shareImageUrl: bet.shareImageId ? await ctx.storage.getUrl(bet.shareImageId) : null,
    };
  },
});

// URL d'upload signée pour la carte de partage (le proprio du pari uploade l'image générée).
export const generateShareUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    return await ctx.storage.generateUploadUrl();
  },
});

// Associe l'image de partage à un pari (proprio uniquement). Supprime l'ancienne si présente.
export const setShareImage = mutation({
  args: { betId: v.id('bets'), storageId: v.id('_storage') },
  handler: async (ctx, { betId, storageId }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    const bet = await ctx.db.get(betId);
    if (!bet || bet.userId !== user._id) throw new Error('Pari introuvable');
    if (bet.shareImageId && bet.shareImageId !== storageId) {
      try {
        await ctx.storage.delete(bet.shareImageId);
      } catch {
        /* déjà supprimée */
      }
    }
    await ctx.db.patch(betId, { shareImageId: storageId });
    return { ok: true };
  },
});

// Paris d'un utilisateur donné (profil public — visible par tout membre connecté).
export const forUser = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const me = await currentUser(ctx);
    if (!me) return [];
    const bets = await ctx.db
      .query('bets')
      .withIndex('by_user', (q) => q.eq('userId', userId))
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
                kickoff: m.kickoff,
                status: m.status,
                homeScore: m.homeScore,
                awayScore: m.awayScore,
                homePenalty: m.homePenalty,
                awayPenalty: m.awayPenalty,
              }
            : null,
        };
      }),
    );
  },
});

// Pose un pari combiné : valide, recalcule les cotes (autoritatif), débite les jetons.
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
    if (stake > user.flames) throw new Error('Solde de jetons insuffisant');

    // Refuse toute combinaison logiquement impossible (contradictoire) ou corrélée au score exact.
    const legality = validateLegs(legs);
    if (!legality.ok) throw new Error(legality.reason);

    const { odds, lambdas } = await resolveOdds(ctx, match);
    const seen = new Set<string>();
    const computed = legs.map((leg) => {
      if (!MARKETS.includes(leg.market as Market)) throw new Error(`Marché inconnu : ${leg.market}`);
      if (seen.has(leg.market)) throw new Error('Un seul choix par marché');
      seen.add(leg.market);
      return {
        market: leg.market as Market,
        pick: leg.pick,
        label: leg.label,
        odds: legOdds(odds, lambdas, leg.market, leg.pick),
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

// Modifie un pari existant TANT QUE le match n'a pas commencé (sinon c'est verrouillé).
// Rembourse l'ancienne mise, revalide, recalcule les cotes (autoritatif) et re-débite le delta.
export const update = mutation({
  args: {
    betId: v.id('bets'),
    stake: v.number(),
    legs: v.array(v.object({ market: v.string(), pick: v.string(), label: v.string() })),
  },
  handler: async (ctx, { betId, stake, legs }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    const bet = await ctx.db.get(betId);
    if (!bet || bet.userId !== user._id) throw new Error('Pari introuvable');
    if (bet.status !== 'pending') throw new Error('Ce pari est déjà réglé, impossible de le modifier');
    const match = await ctx.db.get(bet.matchId);
    if (!match) throw new Error('Match introuvable');
    if (match.status !== 'scheduled' || match.kickoff <= Date.now())
      throw new Error('Ce match a déjà commencé');
    if (legs.length === 0) throw new Error('Aucune sélection');
    if (!Number.isFinite(stake) || stake <= 0 || !Number.isInteger(stake))
      throw new Error('Mise invalide');
    // Le solde disponible inclut le remboursement de l'ancienne mise.
    if (stake > user.flames + bet.stake) throw new Error('Solde de jetons insuffisant');

    // Refuse toute combinaison logiquement impossible (contradictoire) ou corrélée au score exact.
    const legality = validateLegs(legs);
    if (!legality.ok) throw new Error(legality.reason);

    const { odds, lambdas } = await resolveOdds(ctx, match);
    const seen = new Set<string>();
    const computed = legs.map((leg) => {
      if (!MARKETS.includes(leg.market as Market)) throw new Error(`Marché inconnu : ${leg.market}`);
      if (seen.has(leg.market)) throw new Error('Un seul choix par marché');
      seen.add(leg.market);
      return {
        market: leg.market as Market,
        pick: leg.pick,
        label: leg.label,
        odds: legOdds(odds, lambdas, leg.market, leg.pick),
      };
    });

    const totalOdds = round2(computed.reduce((p, x) => p * x.odds, 1));
    const potentialPayout = Math.round(stake * totalOdds);
    // Rembourse l'ancienne mise puis débite la nouvelle (solde jamais négatif : stake ≤ flames + bet.stake).
    const newBalance = user.flames + bet.stake - stake;

    await ctx.db.patch(user._id, { flames: newBalance });
    await ctx.db.patch(betId, { legs: computed, stake, totalOdds, potentialPayout });

    // Garde le journal d'audit cohérent avec le solde : ajuste la transaction de mise d'origine.
    const txns = await ctx.db
      .query('flameTransactions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    const stakeTx = txns.find((t) => t.refId === betId && t.reason === 'prediction_stake');
    if (stakeTx) await ctx.db.patch(stakeTx._id, { amount: -stake });
    else
      await ctx.db.insert('flameTransactions', {
        userId: user._id,
        amount: -stake,
        reason: 'prediction_stake',
        refId: betId,
        createdAt: Date.now(),
      });

    return { betId, totalOdds, potentialPayout, newBalance };
  },
});

// Annule un pari existant TANT QUE le match n'a pas commencé (sinon c'est verrouillé).
// Rembourse la mise et supprime le pari + sa transaction de mise (comme s'il n'avait pas eu lieu).
export const cancel = mutation({
  args: { betId: v.id('bets') },
  handler: async (ctx, { betId }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    const bet = await ctx.db.get(betId);
    if (!bet || bet.userId !== user._id) throw new Error('Pari introuvable');
    if (bet.status !== 'pending') throw new Error('Ce pari est déjà réglé, impossible de l’annuler');
    const match = await ctx.db.get(bet.matchId);
    if (!match) throw new Error('Match introuvable');
    if (match.status !== 'scheduled' || match.kickoff <= Date.now())
      throw new Error('Ce match a déjà commencé');

    // Rembourse la mise, retire l'écriture d'audit correspondante puis supprime le pari.
    const newBalance = user.flames + bet.stake;
    await ctx.db.patch(user._id, { flames: newBalance });
    const txns = await ctx.db
      .query('flameTransactions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    for (const t of txns) {
      if (t.refId === betId && t.reason === 'prediction_stake') await ctx.db.delete(t._id);
    }
    await ctx.db.delete(betId);

    return { newBalance };
  },
});
