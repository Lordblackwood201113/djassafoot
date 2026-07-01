import { v } from 'convex/values';

import { api, internal } from './_generated/api';
import { internalAction, internalMutation } from './_generated/server';

const BASE = 'https://api.odds-api.io/v3';
const WC_SLUG = 'international-fifa-world-cup';
const BOOKMAKER = 'Betfair Exchange';
const DAY = 24 * 60 * 60 * 1000;

// Aligne les orthographes odds-api.io → nos noms (TheSportsDB) avant normalisation.
const ALIAS: Record<string, string> = {
  'Bosnia and Herzegovina': 'Bosnia-Herzegovina',
  'Congo DR': 'DR Congo',
};

const norm = (s: string) =>
  (ALIAS[s] ?? s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');

const pairKey = (a: string, b: string) => [norm(a), norm(b)].sort().join('~');
const numOdd = (x: any): number | undefined => {
  const n = parseFloat(x);
  return Number.isFinite(n) && n > 1 ? n : undefined;
};

// Extrait nos 3 marchés depuis la réponse /odds d'un bookmaker.
function parseMarkets(markets: any[]) {
  const out: { home?: number; draw?: number; away?: number; over?: number; under?: number; bttsYes?: number; bttsNo?: number } = {};
  for (const m of markets ?? []) {
    if (m.name === 'ML') {
      const o = m.odds?.[0];
      if (o) {
        out.home = numOdd(o.home);
        out.draw = numOdd(o.draw);
        out.away = numOdd(o.away);
      }
    } else if (m.name === 'Totals') {
      const line = m.odds?.find((x: any) => Number(x.hdp) === 2.5);
      if (line) {
        out.over = numOdd(line.over);
        out.under = numOdd(line.under);
      }
    } else if (m.name === 'Both Teams To Score') {
      const o = m.odds?.[0];
      if (o) {
        out.bttsYes = numOdd(o.yes);
        out.bttsNo = numOdd(o.no);
      }
    }
  }
  return out;
}

export const upsertOdds = internalMutation({
  args: { rows: v.array(v.any()) },
  handler: async (ctx, { rows }) => {
    const now = Date.now();
    for (const r of rows as any[]) {
      const clean: any = Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined));
      const existing = await ctx.db
        .query('odds')
        .withIndex('by_match', (q) => q.eq('matchId', r.matchId))
        .unique();
      if (existing) await ctx.db.patch(existing._id, { ...clean, updatedAt: now });
      else await ctx.db.insert('odds', { ...clean, source: 'odds-api.io', bookmaker: BOOKMAKER, updatedAt: now });
    }
    return rows.length;
  },
});

// Synchronise les cotes réelles des matchs CdM à venir.
export const syncOdds = internalAction({
  args: {},
  handler: async (ctx): Promise<{ matched: number; stored: number; calls: number }> => {
    const key = process.env.ODDS_API_IO_KEY;
    if (!key) return { matched: 0, stored: 0, calls: 0 };

    // Nos matchs programmés (à venir).
    const ours: any[] = await ctx.runQuery(api.matches.list, {});
    const upcoming = ours.filter((m) => m.status === 'scheduled' && m.kickoff > Date.now());
    const byPair = new Map<string, { matchId: string; kickoff: number }[]>();
    for (const m of upcoming) {
      const k = pairKey(m.homeName, m.awayName);
      (byPair.get(k) ?? byPair.set(k, []).get(k)!).push({ matchId: m._id, kickoff: m.kickoff });
    }

    // Événements CdM côté odds-api.io.
    const evRes = await fetch(`${BASE}/events?sport=football&league=${WC_SLUG}&apiKey=${key}`);
    let calls = 1;
    if (!evRes.ok) throw new Error(`odds-api events HTTP ${evRes.status}`);
    const evData: any = await evRes.json();
    const events: any[] = Array.isArray(evData) ? evData : (evData.events ?? evData.data ?? []);

    const rows: any[] = [];
    let matched = 0;
    for (const e of events) {
      if (e.status === 'settled') continue;
      const cands = byPair.get(pairKey(e.home, e.away));
      if (!cands || cands.length === 0) continue;
      const evMs = Date.parse(e.date);
      const best = cands
        .map((c) => ({ ...c, gap: Math.abs(c.kickoff - evMs) }))
        .sort((a, b) => a.gap - b.gap)[0];
      if (!best || best.gap > 2 * DAY) continue;
      matched++;

      // Cotes de cet événement.
      const oRes = await fetch(
        `${BASE}/odds?eventId=${e.id}&bookmakers=${encodeURIComponent(BOOKMAKER)}&apiKey=${key}`,
      );
      calls++;
      if (!oRes.ok) continue;
      const oData: any = await oRes.json();
      const markets = oData?.bookmakers?.[BOOKMAKER];
      if (!markets) continue;
      const parsed = parseMarkets(markets);
      if (Object.values(parsed).some((x) => x !== undefined)) {
        rows.push({ matchId: best.matchId, ...parsed });
      }
    }

    const stored = rows.length > 0 ? await ctx.runMutation(internal.oddsSync.upsertOdds, { rows }) : 0;
    return { matched, stored, calls };
  },
});
