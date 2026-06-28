import { v } from 'convex/values';

import { query } from './_generated/server';

const THREE_HOURS = 3 * 60 * 60 * 1000;

// Matchs à venir (et ceux démarrés il y a < 3h), triés par coup d'envoi.
export const upcoming = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const now = Date.now();
    const max = limit ?? 30;
    const rows = await ctx.db
      .query('matches')
      .withIndex('by_kickoff', (q) => q.gte('kickoff', now - THREE_HOURS))
      .order('asc')
      .take(max + 25);
    return rows.filter((m) => m.status !== 'finished').slice(0, max);
  },
});

// Matchs en direct.
export const live = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('matches')
      .withIndex('by_status', (q) => q.eq('status', 'live'))
      .collect();
  },
});

// Détail d'un match.
export const byId = query({
  args: { id: v.id('matches') },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Tous les matchs triés par coup d'envoi (pour le filtrage par jour côté client).
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('matches').withIndex('by_kickoff').order('asc').collect();
  },
});
