import { query } from './_generated/server';

// Tous les classements (poules), triés par groupe puis rang.
export const all = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('standings').collect();
    return rows.sort((a, b) => (a.group ?? '').localeCompare(b.group ?? '') || a.rank - b.rank);
  },
});
