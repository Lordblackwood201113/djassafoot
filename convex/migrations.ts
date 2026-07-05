import { v } from 'convex/values';

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

// Outil admin : re-règle un pari sur un score donné (ex. corriger un règlement erroné).
// Idempotent : n'agit QUE si le pari est actuellement 'won' et devient 'lost' sur ce score.
// Bascule le pari en perdu (payout 0), retire les jetons crédités du solde, journalise une
// transaction de correction (trace), et corrige la notification « gagné ».
export const resettleBetOnScore = internalMutation({
  args: { betId: v.id('bets'), homeScore: v.number(), awayScore: v.number() },
  handler: async (ctx, { betId, homeScore, awayScore }) => {
    const bet = await ctx.db.get(betId);
    if (!bet) return { error: 'pari introuvable' };
    if (bet.status !== 'won') return { skipped: `statut actuel = ${bet.status}` };

    const legWon = (leg: { market: string; pick: string }): boolean => {
      switch (leg.market) {
        case 'result_1x2':
          return leg.pick === (homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw');
        case 'over_under_2_5':
          return leg.pick === (homeScore + awayScore > 2.5 ? 'over' : 'under');
        case 'btts':
          return leg.pick === (homeScore > 0 && awayScore > 0 ? 'yes' : 'no');
        case 'exact_score':
          return leg.pick === `${homeScore}-${awayScore}`;
        default:
          return false;
      }
    };
    const updatedLegs = bet.legs.map((l) => ({
      ...l,
      result: (legWon(l) ? 'won' : 'lost') as 'won' | 'lost' | 'void',
    }));
    if (updatedLegs.every((l) => l.result === 'won')) {
      return { skipped: 'toujours gagnant sur ce score' };
    }

    const credited = bet.payout ?? 0;
    const now = Date.now();
    await ctx.db.patch(betId, { status: 'lost', payout: 0, legs: updatedLegs, settledAt: now });

    const user = await ctx.db.get(bet.userId);
    let newBalance: number | null = null;
    if (user) {
      newBalance = user.flames - credited;
      await ctx.db.patch(user._id, { flames: newBalance });
      await ctx.db.insert('flameTransactions', {
        userId: user._id,
        amount: -credited,
        reason: 'settlement_correction',
        refId: betId,
        createdAt: now,
      });
    }

    const match = await ctx.db.get(bet.matchId);
    const notifs = (await ctx.db.query('notifications').collect()).filter(
      (n) => n.betId === betId && n.kind === 'prediction_resolved',
    );
    for (const n of notifs) {
      await ctx.db.patch(n._id, {
        title: 'Prono recalculé',
        body: `Ton prono sur ${match?.homeName ?? ''} - ${match?.awayName ?? ''} a été recalculé sur le score final (${homeScore}-${awayScore}) : il est perdant. Les ${credited.toLocaleString('fr-FR')} 🪙 crédités par erreur ont été retirés.`,
        read: false,
      });
    }

    return { user: user?.username, removed: credited, newBalance, notifsCorrigees: notifs.length };
  },
});

// Outil admin : rembourse TOUS les paris des utilisateurs ayant placé PLUS D'UN pari sur un match
// (application de la règle CGU « un seul pronostic par événement »). Rembourser = rendre la mise,
// annuler le pari (statut 'void'), retirer un gain éventuellement déjà crédité, journaliser une
// transaction 'refund' et notifier l'utilisateur. Les joueurs à UN seul pari ne sont pas touchés.
// Idempotent : un pari déjà 'void' est ignoré (2e passage = no-op).
//   Aperçu :  npx convex run migrations:refundMultiBetsForMatch '{"matchId":"<id>","dryRun":true}'
//   Exécuter : npx convex run migrations:refundMultiBetsForMatch '{"matchId":"<id>"}'
export const refundMultiBetsForMatch = internalMutation({
  args: { matchId: v.id('matches'), dryRun: v.optional(v.boolean()) },
  handler: async (ctx, { matchId, dryRun }) => {
    const match = await ctx.db.get(matchId);
    if (!match) return { error: 'match introuvable' };

    const bets = await ctx.db
      .query('bets')
      .withIndex('by_match', (q) => q.eq('matchId', matchId))
      .collect();

    // Regroupe par utilisateur, tous statuts confondus (pour déterminer « > 1 pari »).
    const byUser = new Map<string, typeof bets>();
    for (const b of bets) {
      const arr = byUser.get(b.userId) ?? [];
      arr.push(b);
      byUser.set(b.userId, arr);
    }

    const now = Date.now();
    const details: Array<Record<string, unknown>> = [];
    let betsRefunded = 0;
    let totalStakeReturned = 0;

    for (const [, userBets] of byUser) {
      if (userBets.length <= 1) continue; // uniquement ceux ayant placé PLUS d'un pari
      const toRefund = userBets.filter((b) => b.status !== 'void'); // idempotence
      if (toRefund.length === 0) continue;

      const user = await ctx.db.get(userBets[0].userId);
      let balanceDelta = 0;
      for (const bet of toRefund) {
        // Rendre la mise, et retirer un gain si le pari avait déjà été réglé gagnant → solde
        // ramené à l'état « comme si le pari n'avait pas existé ».
        const delta = bet.stake - (bet.payout ?? 0);
        balanceDelta += delta;
        totalStakeReturned += bet.stake;
        betsRefunded++;
        if (!dryRun) {
          await ctx.db.patch(bet._id, { status: 'void', payout: 0, settledAt: now });
          await ctx.db.insert('flameTransactions', {
            userId: bet.userId,
            amount: delta,
            reason: 'refund',
            refId: bet._id,
            createdAt: now,
          });
        }
      }

      if (user && !dryRun) {
        await ctx.db.patch(user._id, { flames: user.flames + balanceDelta });
        await ctx.db.insert('notifications', {
          userId: user._id,
          kind: 'bets_refunded',
          title: 'Paris remboursés 🪙',
          body: `Un seul pronostic est autorisé par match. Tes ${toRefund.length} pronostics sur ${match.homeName} - ${match.awayName} ont été annulés et intégralement remboursés.`,
          matchId: match._id,
          read: false,
          createdAt: now,
        });
      }

      details.push({
        user: user?.username ?? userBets[0].userId,
        parisTotal: userBets.length,
        parisRembourses: toRefund.length,
        miseRendue: toRefund.reduce((s, b) => s + b.stake, 0),
        soldeDelta: balanceDelta,
        soldeAvant: user?.flames,
        soldeApres: (user?.flames ?? 0) + balanceDelta,
      });
    }

    return {
      match: `${match.homeName} - ${match.awayName}`,
      dryRun: !!dryRun,
      joueursConcernes: details.length,
      parisRembourses: betsRefunded,
      totalMiseRendue: totalStakeReturned,
      details,
    };
  },
});
