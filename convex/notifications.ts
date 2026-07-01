import { mutation, query, type QueryCtx } from './_generated/server';

async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
    .unique();
}

// Notifications de l'utilisateur courant (50 plus récentes).
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    return await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(50);
  },
});

// Nombre de notifications non lues (badge de la cloche).
export const unreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return 0;
    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    return rows.filter((n) => !n.read).length;
  },
});

// Marque toutes les notifications comme lues.
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return 0;
    const rows = await ctx.db
      .query('notifications')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    const unread = rows.filter((n) => !n.read);
    for (const n of unread) await ctx.db.patch(n._id, { read: true });
    return unread.length;
  },
});
