import { v } from 'convex/values';

import { internal } from './_generated/api';
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
  if (['FT', 'AET', 'PEN', 'AWD', 'WO'].includes(x)) return 'finished';
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
