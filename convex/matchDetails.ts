import { v } from 'convex/values';

import { api, internal } from './_generated/api';
import { action, internalMutation, query } from './_generated/server';

// Détail d'un match via TheSportsDB v2 (header X-API-KEY) : compo, timeline, stats, média.
const BASE = 'https://www.thesportsdb.com/api/v2/json';
const headers = () => ({
  'X-API-KEY': process.env.THESPORTSDB_KEY ?? '',
  'Content-Type': 'application/json',
});

function num(x: any): number | undefined {
  if (x === null || x === undefined || x === '') return undefined;
  const n = Number(x);
  return Number.isNaN(n) ? undefined : n;
}

function yes(x: any): boolean {
  return String(x ?? '').toLowerCase() === 'yes';
}

function clean(x: any): string | undefined {
  const s = x == null ? '' : String(x).trim();
  return s && s.toUpperCase() !== 'NULL' ? s : undefined;
}

// Regroupe le type d'événement TheSportsDB en familles simples pour l'UI.
function eventType(strTimeline: any): string {
  const t = String(strTimeline ?? '').toLowerCase();
  if (t.includes('goal')) return 'goal';
  if (t.includes('card')) return 'card';
  if (t.includes('subst')) return 'subst';
  if (t.includes('var')) return 'var';
  return 'other';
}

// Compo (22 joueurs) — dispo seulement une fois confirmée (~1h avant le coup d'envoi).
function normalizeLineup(list: any[]): any[] {
  return (list ?? [])
    .map((p) => ({
      name: clean(p.strPlayer) ?? '',
      photo: clean(p.strCutout),
      position: clean(p.strPosition),
      positionShort: clean(p.strPositionShort),
      number: num(p.intSquadNumber),
      isSub: yes(p.strSubstitute),
      isHome: yes(p.strHome),
    }))
    .filter((p) => p.name);
}

// Temps forts (buts, cartons, remplacements, VAR), triés par minute.
function normalizeTimeline(list: any[]): any[] {
  return (list ?? [])
    .map((t) => ({
      minute: num(t.intTime),
      type: eventType(t.strTimeline),
      detail: clean(t.strTimelineDetail),
      player: clean(t.strPlayer),
      playerPhoto: clean(t.strCutout),
      assist: clean(t.strAssist),
      isHome: yes(t.strHome),
    }))
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));
}

// Statistiques (tirs, possession, passes, xG…).
function normalizeStats(list: any[]): any[] {
  return (list ?? [])
    .map((s) => ({
      stat: clean(s.strStat) ?? '',
      home: clean(s.intHome),
      away: clean(s.intAway),
    }))
    .filter((s) => s.stat);
}

// --- Compo API-Football (formation + grid = placement terrain) ---
const AF_BASE = 'https://v3.football.api-sports.io';

function mapAF(pl: any, isHome: boolean, isSub: boolean) {
  return {
    name: clean(pl?.name) ?? '',
    number: num(pl?.number),
    positionShort: clean(pl?.pos),
    grid: clean(pl?.grid), // "ligne:colonne", ex. "2:4" (null pour les remplaçants)
    apiId: num(pl?.id), // id joueur API-Football → jointure des notes
    isSub,
    isHome,
  };
}

// Notes des joueurs (post-match) via API-Football, scoped par fixture (passe en gratuit).
// Renvoie une note par id joueur ET par nom (fallback si l'id manque dans une compo en cache).
async function fetchApiFootballRatings(
  fixtureId: string,
): Promise<{ byId: Map<number, number>; byName: Map<string, number> } | null> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${AF_BASE}/fixtures/players?fixture=${fixtureId}`, {
      headers: { 'x-apisports-key': key },
    });
    if (!res.ok) return null;
    const d: any = await res.json();
    const byId = new Map<number, number>();
    const byName = new Map<string, number>();
    for (const team of d.response ?? []) {
      for (const pp of team.players ?? []) {
        const raw = pp?.statistics?.[0]?.games?.rating;
        if (raw == null) continue;
        const val = Math.round(parseFloat(String(raw)) * 10) / 10;
        if (!Number.isFinite(val)) continue;
        const id = num(pp?.player?.id);
        const nm = clean(pp?.player?.name);
        if (id != null) byId.set(id, val);
        if (nm) byName.set(nm.toLowerCase(), val);
      }
    }
    return byId.size || byName.size ? { byId, byName } : null;
  } catch {
    return null;
  }
}

// L'appel ciblé par fixture passe même sur le plan gratuit (2026), contrairement à la
// requête par saison. response[0] = équipe domicile, response[1] = extérieur.
async function fetchApiFootballLineup(
  fixtureId: string,
): Promise<{ lineup: any[]; homeFormation?: string; awayFormation?: string } | null> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${AF_BASE}/fixtures/lineups?fixture=${fixtureId}`, {
      headers: { 'x-apisports-key': key },
    });
    if (!res.ok) return null;
    const d: any = await res.json();
    const teams: any[] = d.response ?? [];
    if (teams.length < 2) return null;
    const build = (team: any, isHome: boolean) => [
      ...(team.startXI ?? []).map((p: any) => mapAF(p.player, isHome, false)),
      ...(team.substitutes ?? []).map((p: any) => mapAF(p.player, isHome, true)),
    ];
    const lineup = [...build(teams[0], true), ...build(teams[1], false)].filter((p) => p.name);
    if (!lineup.length) return null;
    return {
      lineup,
      homeFormation: clean(teams[0].formation),
      awayFormation: clean(teams[1].formation),
    };
  } catch {
    return null;
  }
}

// Lecture réactive du détail stocké (null tant qu'aucun sync n'a eu lieu).
export const getDetails = query({
  args: { matchId: v.id('matches') },
  handler: async (ctx, { matchId }) => {
    return await ctx.db
      .query('matchDetails')
      .withIndex('by_match', (q) => q.eq('matchId', matchId))
      .unique();
  },
});

export const upsertDetails = internalMutation({
  args: { matchId: v.id('matches'), data: v.any() },
  handler: async (ctx, { matchId, data }) => {
    const existing = await ctx.db
      .query('matchDetails')
      .withIndex('by_match', (q) => q.eq('matchId', matchId))
      .unique();
    const doc = { matchId, ...data, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, doc);
    } else {
      await ctx.db.insert('matchDetails', doc);
    }
  },
});

// Récupère compo + timeline + stats + média depuis TheSportsDB et les stocke.
// Appelé à la demande depuis l'écran match (compo ~1h avant, temps forts/stats après).
export const syncDetails = action({
  args: { matchId: v.id('matches') },
  handler: async (ctx, { matchId }): Promise<{ ok: boolean; lineup?: number; timeline?: number; stats?: number }> => {
    if (!process.env.THESPORTSDB_KEY) return { ok: false };
    const match = await ctx.runQuery(api.matches.byId, { id: matchId });
    if (!match) return { ok: false };
    const ev = match.apiId;

    const get = async (path: string) => {
      try {
        const res = await fetch(`${BASE}/lookup/${path}/${ev}`, { headers: headers() });
        if (!res.ok) return {};
        return (await res.json()) as any;
      } catch {
        return {};
      }
    };

    const [lineupJ, timelineJ, statsJ, eventJ] = await Promise.all([
      get('event_lineup'),
      get('event_timeline'),
      get('event_stats'),
      get('event'),
    ]);

    const timeline = normalizeTimeline(timelineJ.lookup ?? []);
    const stats = normalizeStats(statsJ.lookup ?? []);
    const e = (eventJ.lookup ?? eventJ.events ?? [])[0] ?? {};

    // Compo : le XI titulaire ne change pas → si la compo terrain (formation) est déjà
    // en cache, on la garde (0 appel API-Football). Sinon on tente API-Football (placement
    // terrain), et à défaut la liste TheSportsDB (avec photos, sans positions).
    const existing = await ctx.runQuery(api.matchDetails.getDetails, { matchId });
    let lineup: any[] = existing?.lineup ?? [];
    let homeFormation: string | undefined = existing?.homeFormation;
    let awayFormation: string | undefined = existing?.awayFormation;

    const idAF = clean(e.idAPIfootball);
    if (!homeFormation) {
      const af = idAF ? await fetchApiFootballLineup(idAF) : null;
      if (af) {
        lineup = af.lineup;
        homeFormation = af.homeFormation;
        awayFormation = af.awayFormation;
      } else {
        const tsdb = normalizeLineup(lineupJ.lookup ?? []);
        if (tsdb.length) lineup = tsdb;
      }
    }

    // Notes joueurs : uniquement une fois le match TERMINÉ (notes finales) et pas déjà en cache.
    // → 1 seul appel API-Football par match (protège le quota gratuit de 100/jour).
    const hasRatings = lineup.some((p) => p.rating != null);
    if (idAF && lineup.length && match.status === 'finished' && !hasRatings) {
      const rt = await fetchApiFootballRatings(idAF);
      if (rt) {
        lineup = lineup.map((p) => {
          const r =
            (p.apiId != null ? rt.byId.get(p.apiId) : undefined) ??
            (p.name ? rt.byName.get(p.name.toLowerCase()) : undefined);
          return r != null ? { ...p, rating: r } : p;
        });
      }
    }

    // JSON round-trip : supprime récursivement les clés undefined (schéma strict).
    const data = JSON.parse(
      JSON.stringify({
        lineup,
        homeFormation,
        awayFormation,
        timeline,
        stats,
        videoUrl: clean(e.strVideo),
        venue: clean(e.strVenue),
        spectators: num(e.intSpectators),
      }),
    );

    await ctx.runMutation(internal.matchDetails.upsertDetails, { matchId, data });
    return { ok: true, lineup: lineup.length, timeline: timeline.length, stats: stats.length };
  },
});
