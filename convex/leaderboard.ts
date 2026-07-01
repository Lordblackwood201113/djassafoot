import type { Id } from './_generated/dataModel';
import { query, type QueryCtx } from './_generated/server';

async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
    .unique();
}

// Classement global : top 100 des utilisateurs ordonnés par solde de jetons
export const global = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('users')
      .withIndex('by_flames')
      .order('desc')
      .take(100);
  },
});

// Classement amis : l'utilisateur + tous ses amis acceptés, ordonnés par solde de jetons
export const friends = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];

    // Récupérer les amitiés acceptées (émises)
    const sent = await ctx.db
      .query('friends')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    // Récupérer les amitiés acceptées (reçues)
    const received = await ctx.db
      .query('friends')
      .withIndex('by_friend', (q) => q.eq('friendId', user._id))
      .collect();

    const acceptedSent = sent.filter((f) => f.status === 'accepted');
    const acceptedReceived = received.filter((f) => f.status === 'accepted');

    // Extraire les IDs uniques de l'utilisateur et de ses amis
    const memberIds = new Set<string>();
    memberIds.add(user._id);
    for (const f of acceptedSent) memberIds.add(f.friendId);
    for (const f of acceptedReceived) memberIds.add(f.userId);

    // Récupérer les fiches utilisateurs correspondantes
    const members = [];
    for (const id of memberIds) {
      const u = await ctx.db.get(id as Id<'users'>);
      if (u) {
        members.push(u);
      }
    }

    // Trier les membres par solde de jetons décroissant
    return members.sort((a, b) => b.flames - a.flames);
  },
});
