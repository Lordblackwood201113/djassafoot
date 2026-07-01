import { internalMutation } from './_generated/server';

// Migration ponctuelle — retire l'ancien champ `points` (score de classement)
// désormais remplacé par le classement au solde de jetons (`flames`).
//
// À lancer UNE fois après avoir déployé le schéma où `points` est optionnel :
//   npx convex run migrations:stripPoints
//
// Une fois exécutée (cleaned == 0 au 2e appel), on peut retirer définitivement
// `points` du schéma (schema.ts) puis supprimer ce fichier.
export const stripPoints = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    let cleaned = 0;
    for (const u of users) {
      if (u.points !== undefined) {
        await ctx.db.patch(u._id, { points: undefined });
        cleaned++;
      }
    }
    return { total: users.length, cleaned };
  },
});
