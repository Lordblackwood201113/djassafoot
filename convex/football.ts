import { v } from 'convex/values';

import { api, internal } from './_generated/api';
import { internalAction, internalMutation } from './_generated/server';

// FIFA World Cup 2026 sur TheSportsDB (v2, header X-API-KEY).
const WC_LEAGUE = '4429';
const WC_SEASON = '2026';
const BASE = 'https://www.thesportsdb.com/api/v2/json';

const headers = () => ({
  'X-API-KEY': process.env.THESPORTSDB_KEY ?? '',
  'Content-Type': 'application/json',
});

function mapStatus(s: any): 'scheduled' | 'live' | 'finished' {
  const x = String(s ?? '').toUpperCase();
  // 'AP' = After Penalties (match décidé aux tirs au but) — sinon il restait « scheduled ».
  if (['FT', 'AET', 'AP', 'PEN', 'AWD', 'WO'].includes(x)) return 'finished';
  if (['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE'].includes(x)) return 'live';
  return 'scheduled';
}

function toKickoff(ts: any, dateEvent: any, strTime: any): number {
  let s: string = ts || (dateEvent ? `${dateEvent}T${strTime ?? '00:00:00'}` : '');
  if (!s) return 0;
  const hasTz = /[zZ]$/.test(s) || /[+-]\d\d:?\d\d$/.test(s);
  const ms = Date.parse(hasTz ? s : `${s}Z`); // strTimestamp est UTC sans suffixe → on force Z
  return Number.isNaN(ms) ? 0 : ms;
}

function num(x: any): number | undefined {
  if (x === null || x === undefined || x === '') return undefined;
  const n = Number(x);
  return Number.isNaN(n) ? undefined : n;
}

function minuteFrom(p: any): number | undefined {
  if (!p) return undefined;
  const m = String(p).match(/(\d+)/);
  return m ? Number(m[1]) : undefined;
}

function normalize(ev: any) {
  return {
    apiId: String(ev.idEvent ?? ''),
    competitionApiId: String(ev.idLeague ?? WC_LEAGUE),
    season: ev.strSeason ? String(ev.strSeason) : WC_SEASON,
    round: ev.intRound != null && ev.intRound !== '' ? String(ev.intRound) : undefined,
    homeName: ev.strHomeTeam ?? '',
    awayName: ev.strAwayTeam ?? '',
    homeTeamApiId: ev.idHomeTeam ? String(ev.idHomeTeam) : undefined,
    awayTeamApiId: ev.idAwayTeam ? String(ev.idAwayTeam) : undefined,
    homeBadgeUrl: ev.strHomeTeamBadge || undefined,
    awayBadgeUrl: ev.strAwayTeamBadge || undefined,
    kickoff: toKickoff(ev.strTimestamp, ev.dateEvent, ev.strTime),
    status: mapStatus(ev.strStatus),
    homeScore: num(ev.intHomeScore),
    awayScore: num(ev.intAwayScore),
    minute: minuteFrom(ev.strProgress),
  };
}

// Upsert par apiId. On filtre les undefined → un live update n'écrase pas les badges/noms.
export const upsertMatches = internalMutation({
  args: { matches: v.array(v.any()) },
  handler: async (ctx, { matches }) => {
    let n = 0;
    const settledMatchIds: any[] = [];
    for (const m of matches as any[]) {
      if (!m.apiId) continue;
      const clean: any = Object.fromEntries(
        Object.entries({ ...m, updatedAt: Date.now() }).filter(([, val]) => val !== undefined),
      );
      const existing = await ctx.db
        .query('matches')
        .withIndex('by_api', (q) => q.eq('apiId', m.apiId))
        .unique();
      if (existing) {
        const wasFinished = existing.status === 'finished';
        const isFinished = clean.status === 'finished';
        await ctx.db.patch(existing._id, clean);
        if (!wasFinished && isFinished) {
          settledMatchIds.push(existing._id);
        }
        n++;
      } else if (m.homeName && m.awayName && m.kickoff) {
        const id = await ctx.db.insert('matches', clean);
        if (clean.status === 'finished') {
          settledMatchIds.push(id);
        }
        n++;
      }
    }
    return { count: n, settledMatchIds };
  },
});

function normalizeStanding(t: any) {
  const gf = num(t.intGoalsFor) ?? 0;
  const ga = num(t.intGoalsAgainst) ?? 0;
  return {
    group: t.strGroup ? String(t.strGroup) : undefined,
    rank: num(t.intRank) ?? 0,
    teamApiId: t.idTeam ? String(t.idTeam) : undefined,
    teamName: t.strTeam ?? '',
    badgeUrl: t.strBadge ? String(t.strBadge).replace(/\/tiny$/, '') : undefined,
    played: num(t.intPlayed) ?? 0,
    win: num(t.intWin) ?? 0,
    draw: num(t.intDraw) ?? 0,
    loss: num(t.intLoss) ?? 0,
    goalsFor: gf,
    goalsAgainst: ga,
    goalDiff: num(t.intGoalDifference) ?? gf - ga,
    points: num(t.intPoints) ?? 0,
  };
}

// Remplace tout le classement de la compétition (les classements sont recalculés en entier).
export const upsertStandings = internalMutation({
  args: { rows: v.array(v.any()) },
  handler: async (ctx, { rows }) => {
    const existing = await ctx.db
      .query('standings')
      .withIndex('by_competition', (q) => q.eq('competitionApiId', WC_LEAGUE))
      .collect();
    for (const e of existing) await ctx.db.delete(e._id);
    const now = Date.now();
    for (const r of rows as any[]) {
      await ctx.db.insert('standings', { ...r, competitionApiId: WC_LEAGUE, updatedAt: now });
    }
    return rows.length;
  },
});

// Classements par poule de la CdM 2026.
export const syncStandings = internalAction({
  args: {},
  handler: async (ctx): Promise<number> => {
    const key = process.env.THESPORTSDB_KEY;
    if (!key) return 0;
    // Le classement n'existe qu'en v1 (la v2 renvoie « Invalid ID passed »).
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${key}/lookuptable.php?l=${WC_LEAGUE}&s=${WC_SEASON}`,
    );
    if (!res.ok) throw new Error(`TheSportsDB table HTTP ${res.status}`);
    const data: any = await res.json();
    const table: any[] = data.table ?? [];
    const rows = table.map(normalizeStanding).filter((r) => r.teamName);
    return await ctx.runMutation(internal.football.upsertStandings, { rows });
  },
});

// Calendrier complet de la CdM 2026.
export const syncFixtures = internalAction({
  args: {},
  handler: async (ctx): Promise<number> => {
    if (!process.env.THESPORTSDB_KEY) return 0;
    const res = await fetch(`${BASE}/schedule/league/${WC_LEAGUE}/${WC_SEASON}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`TheSportsDB schedule HTTP ${res.status}`);
    const data: any = await res.json();
    const events: any[] = data.schedule ?? data.events ?? [];
    const matches = events.map(normalize).filter((m) => m.apiId && m.kickoff);
    const { count, settledMatchIds } = await ctx.runMutation(internal.football.upsertMatches, { matches });
    for (const matchId of settledMatchIds) {
      await ctx.runMutation(internal.settlement.settleMatch, { matchId });
    }
    return count;
  },
});

// Tirs au but (phase finale). TheSportsDB ne fournit pas de score de séance → on l'obtient
// d'API-Football (`score.penalty`) via l'idAPIfootball du match. Seulement pour les matchs à
// élimination TERMINÉS sur un score de parité et pas encore enrichis (donc très peu d'appels).
const KO_ROUNDS = ['32', '16', '125', '150', '200'];

export const setKnockoutResult = internalMutation({
  args: {
    matchId: v.id('matches'),
    winner: v.optional(v.union(v.literal('home'), v.literal('away'))),
    homePenalty: v.optional(v.number()),
    awayPenalty: v.optional(v.number()),
  },
  handler: async (ctx, { matchId, winner, homePenalty, awayPenalty }) => {
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (winner) patch.winner = winner;
    if (homePenalty != null) patch.homePenalty = homePenalty;
    if (awayPenalty != null) patch.awayPenalty = awayPenalty;
    await ctx.db.patch(matchId, patch);
  },
});

export const enrichPenalties = internalAction({
  args: {},
  handler: async (ctx): Promise<{ checked: number; filled: number }> => {
    const afKey = process.env.API_FOOTBALL_KEY;
    if (!process.env.THESPORTSDB_KEY || !afKey) return { checked: 0, filled: 0 };

    const all = await ctx.runQuery(api.matches.list);
    // Matchs à élimination terminés sur un score de parité (donc décidés en prolongation/t.a.b.),
    // dont on n'a pas encore le vainqueur ni le score des tirs au but.
    const pending = all.filter(
      (m) =>
        KO_ROUNDS.includes(m.round ?? '') &&
        m.status === 'finished' &&
        m.homeScore != null &&
        m.awayScore != null &&
        m.homeScore === m.awayScore &&
        (m.winner == null || m.homePenalty == null),
    );

    let filled = 0;
    for (const m of pending) {
      try {
        // 1) idAPIfootball via le détail TheSportsDB (absent du calendrier).
        const evRes = await fetch(`${BASE}/lookup/event/${m.apiId}`, { headers: headers() });
        if (!evRes.ok) continue;
        const evJson: any = await evRes.json();
        const idAF = (evJson.lookup ?? evJson.events ?? [])[0]?.idAPIfootball;
        if (!idAF) continue;

        // 2) vainqueur + score.penalty via API-Football (fixture ciblée → OK en gratuit).
        const afRes = await fetch(`https://v3.football.api-sports.io/fixtures?id=${idAF}`, {
          headers: { 'x-apisports-key': afKey },
        });
        if (!afRes.ok) continue;
        const f: any = ((await afRes.json())?.response ?? [])[0];
        if (!f) continue;

        const winner: 'home' | 'away' | undefined = f.teams?.home?.winner
          ? 'home'
          : f.teams?.away?.winner
            ? 'away'
            : undefined;
        const pen = f.score?.penalty;
        const homePenalty = typeof pen?.home === 'number' ? pen.home : undefined;
        const awayPenalty = typeof pen?.away === 'number' ? pen.away : undefined;

        if (winner || homePenalty != null) {
          await ctx.runMutation(internal.football.setKnockoutResult, {
            matchId: m._id,
            winner,
            homePenalty,
            awayPenalty,
          });
          filled++;
        }
      } catch {
        // on retentera au prochain cron
      }
    }
    return { checked: pending.length, filled };
  },
});

// Scores en direct (matchs en cours).
export const ingestLive = internalAction({
  args: {},
  handler: async (ctx): Promise<number> => {
    if (!process.env.THESPORTSDB_KEY) return 0;
    const res = await fetch(`${BASE}/livescore/${WC_LEAGUE}`, { headers: headers() });
    if (!res.ok) throw new Error(`TheSportsDB livescore HTTP ${res.status}`);
    const data: any = await res.json();
    const events: any[] = data.livescore ?? data.events ?? [];
    const matches = events.map(normalize).filter((m) => m.apiId);
    const { count, settledMatchIds } = await ctx.runMutation(internal.football.upsertMatches, { matches });
    for (const matchId of settledMatchIds) {
      await ctx.runMutation(internal.settlement.settleMatch, { matchId });
    }
    return count;
  },
});
