import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { mutation, query, type QueryCtx } from './_generated/server';

async function currentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  return await ctx.db
    .query('users')
    .withIndex('by_token', (q) => q.eq('tokenIdentifier', identity.subject))
    .unique();
}

// Recherche de joueurs par préfixe de username avec statut d'amitié
export const searchUsers = query({
  args: { queryText: v.string() },
  handler: async (ctx, { queryText }) => {
    const user = await currentUser(ctx);
    if (!user) return [];
    if (queryText.trim().length < 2) return [];

    // Recherche de préfixe lexicographique sur l'index by_username
    const results = await ctx.db
      .query('users')
      .withIndex('by_username', (q) =>
        q.gte('username', queryText).lte('username', queryText + '\uffff'),
      )
      .take(15);

    // Récupérer toutes les relations de l'utilisateur pour calculer les statuts d'amitié
    const sent = await ctx.db
      .query('friends')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    const received = await ctx.db
      .query('friends')
      .withIndex('by_friend', (q) => q.eq('friendId', user._id))
      .collect();

    const relations: Record<string, { status: 'accepted' | 'pending_sent' | 'pending_received'; id: Id<'friends'> }> = {};
    for (const r of sent) {
      relations[r.friendId] = {
        status: r.status === 'accepted' ? 'accepted' : 'pending_sent',
        id: r._id,
      };
    }
    for (const r of received) {
      relations[r.userId] = {
        status: r.status === 'accepted' ? 'accepted' : 'pending_received',
        id: r._id,
      };
    }

    return results
      .filter((u) => u._id !== user._id)
      .map((u) => {
        const rel = relations[u._id];
        return {
          _id: u._id,
          username: u.username,
          avatarUrl: u.avatarUrl,
          flames: u.flames,
          relationship: rel ? rel.status : 'none',
          relationshipId: rel ? rel.id : null,
        };
      });
  },
});

// Liste des demandes d'ami reçues et en attente
export const listPendingRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    if (!user) return [];

    const received = await ctx.db
      .query('friends')
      .withIndex('by_friend', (q) => q.eq('friendId', user._id))
      .collect();

    const pending = received.filter((f) => f.status === 'pending');

    const list = [];
    for (const p of pending) {
      const sender = await ctx.db.get(p.userId);
      if (sender) {
        list.push({
          relationshipId: p._id,
          senderId: sender._id,
          username: sender.username,
          avatarUrl: sender.avatarUrl,
          flames: sender.flames,
          createdAt: p.createdAt,
        });
      }
    }
    return list;
  },
});

// Envoie une demande d'ami
export const sendRequest = mutation({
  args: { friendId: v.id('users') },
  handler: async (ctx, { friendId }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');
    if (user._id === friendId) throw new Error('Impossible de s\'ajouter soi-même');

    const friend = await ctx.db.get(friendId);
    if (!friend) throw new Error('Utilisateur destinataire introuvable');

    // Vérifier s'il y a déjà une relation dans un sens ou dans l'autre
    const existingSent = await ctx.db
      .query('friends')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    const duplicateSent = existingSent.find((f) => f.friendId === friendId);

    const existingReceived = await ctx.db
      .query('friends')
      .withIndex('by_friend', (q) => q.eq('friendId', user._id))
      .collect();
    const duplicateReceived = existingReceived.find((f) => f.userId === friendId);

    if (duplicateSent || duplicateReceived) {
      throw new Error('Une relation ou demande existe déjà avec ce joueur');
    }

    const now = Date.now();
    const relationshipId = await ctx.db.insert('friends', {
      userId: user._id,
      friendId,
      status: 'pending',
      createdAt: now,
    });

    // Envoyer une notification in-app au destinataire
    await ctx.db.insert('notifications', {
      userId: friendId,
      kind: 'friend_request',
      title: 'Demande d\'ami reçue 👥',
      body: `${user.username} souhaite t'ajouter en ami.`,
      read: false,
      createdAt: now,
    });

    return relationshipId;
  },
});

// Accepte une demande d'ami
export const acceptRequest = mutation({
  args: { relationshipId: v.id('friends') },
  handler: async (ctx, { relationshipId }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');

    const rel = await ctx.db.get(relationshipId);
    if (!rel) throw new Error('Demande d\'ami introuvable');
    if (rel.friendId !== user._id) throw new Error('Action non autorisée');
    if (rel.status === 'accepted') return relationshipId;

    const now = Date.now();
    await ctx.db.patch(relationshipId, {
      status: 'accepted',
    });

    // Envoyer une notification in-app à l'expéditeur initial
    await ctx.db.insert('notifications', {
      userId: rel.userId,
      kind: 'friend_accepted',
      title: 'Demande d\'ami acceptée 🎉',
      body: `${user.username} a accepté ta demande d'ami.`,
      read: false,
      createdAt: now,
    });

    return relationshipId;
  },
});

// Refuse une demande d'ami ou supprime un ami
export const declineOrRemove = mutation({
  args: { relationshipId: v.id('friends') },
  handler: async (ctx, { relationshipId }) => {
    const user = await currentUser(ctx);
    if (!user) throw new Error('Non authentifié');

    const rel = await ctx.db.get(relationshipId);
    if (!rel) throw new Error('Relation introuvable');
    if (rel.userId !== user._id && rel.friendId !== user._id) {
      throw new Error('Action non autorisée');
    }

    await ctx.db.delete(relationshipId);
    return { success: true };
  },
});
