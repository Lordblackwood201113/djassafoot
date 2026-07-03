// Helpers de MODÉRATION partagés entre plusieurs fichiers de fonctions Convex.
// Ce module n'expose AUCUNE fonction Convex : il n'importe que les types générés
// (pas de cycle d'import). Importé par users/friends/leaderboard/leagues/moderation.

import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';

// ---------------------------------------------------------------------------
// 1) FILTRE DE MOTS (pseudos + noms de ligue)
// Liste NOIRE fr/en volontairement conservatrice — filet de sécurité, pas une IA.
// À RELIRE / ÉTENDRE par le PO (argot local, nouvelles variantes).
// ---------------------------------------------------------------------------

// Match par TOKEN (mot entier, après normalisation) → zéro faux positif de sous-chaîne.
const BANNED_TOKENS = [
  // fr — insultes / haine
  'connard', 'connasse', 'salope', 'salaud', 'pute', 'putain', 'pouffiasse',
  'encule', 'enculer', 'enculee', 'batard', 'pede', 'tapette', 'pd', 'ntm',
  'nique', 'niquer', 'negro', 'bougnoule', 'youpin', 'merde', 'couille',
  'couilles', 'chatte', 'bite', 'nichon', 'salopard',
  // en — profanité / haine
  'fuck', 'fucker', 'fucking', 'motherfucker', 'shit', 'bitch', 'cunt',
  'asshole', 'bastard', 'dick', 'whore', 'slut', 'rape', 'rapist',
  'nigger', 'nigga', 'faggot', 'fag', 'porn', 'porno', 'sex',
  // haine / extrémisme
  'nazi', 'hitler', 'isis', 'daech', 'kkk', 'pedophile', 'pedo',
];

// Match par SOUS-CHAÎNE (n'importe où) — réservé aux termes quasi jamais innocents,
// pour attraper « xxconnardxx », « fuckyou », etc. sans casser « escalope », « unique »…
const BANNED_SUBSTRINGS = [
  // fr
  'connard', 'connasse', 'salope', 'encule', 'putain', 'bougnoule',
  // en — racines sûres en sous-chaîne (attrape 'FuckLucas', 'shitpost'…). On garde
  // 'dick'/'cunt'/'rape'/'sex'/'fag' en TOKEN seul (Scunthorpe/Dickson/grape/Sussex/flag).
  'motherfucker', 'fuck', 'shit', 'bitch', 'asshole', 'porn', 'whore', 'slut',
  'nigger', 'nigga', 'faggot', 'pedophile', 'nazi',
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // enlève les accents
    // leetspeak courant → lettres
    .replace(/0/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/7/g, 't');
}

/**
 * `false` si `name` contient un mot banni (token exact pour tous, + sous-chaîne pour
 * une liste restreinte de termes sûrs). Utilisé pour pseudos et noms de ligue.
 */
export function isNameAllowed(name: string): boolean {
  const n = normalize(name);
  const compact = n.replace(/[^a-z]/g, '');
  const tokens = new Set(n.split(/[^a-z]+/).filter(Boolean));
  for (const raw of BANNED_TOKENS) {
    if (tokens.has(normalize(raw).replace(/[^a-z]/g, ''))) return false;
  }
  for (const raw of BANNED_SUBSTRINGS) {
    const w = normalize(raw).replace(/[^a-z]/g, '');
    if (w && compact.includes(w)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// 2) BLOCAGE — ensemble des utilisateurs masqués pour `meId` (BIDIRECTIONNEL).
// = ceux que j'ai bloqués ∪ ceux qui m'ont bloqué. Les ids sont comparés en string.
// ---------------------------------------------------------------------------
export async function blockedUserIds(
  ctx: QueryCtx,
  meId: Id<'users'>,
): Promise<Set<string>> {
  const asBlocker = await ctx.db
    .query('blocks')
    .withIndex('by_blocker', (q) => q.eq('blockerId', meId))
    .collect();
  const asBlocked = await ctx.db
    .query('blocks')
    .withIndex('by_blocked', (q) => q.eq('blockedId', meId))
    .collect();
  const set = new Set<string>();
  for (const b of asBlocker) set.add(b.blockedId);
  for (const b of asBlocked) set.add(b.blockerId);
  return set;
}

// ---------------------------------------------------------------------------
// 2bis) Purge des signalements ciblant une ligue → évite les reports orphelins
// quand une ligue est supprimée. À appeler partout où une ligue est effacée.
// ---------------------------------------------------------------------------
export async function purgeLeagueReports(
  ctx: MutationCtx,
  leagueId: Id<'leagues'>,
): Promise<void> {
  const rows = await ctx.db
    .query('reports')
    .withIndex('by_target_league', (q) => q.eq('targetLeagueId', leagueId))
    .collect();
  for (const r of rows) await ctx.db.delete(r._id);
}

// ---------------------------------------------------------------------------
// 3) PURGE d'un utilisateur (cascade). Partagé par `users.deleteMyAccount`
// (auto-suppression) ET `moderation.banUser` (bannissement admin).
// Ligues possédées : transfert au + ancien membre restant, sinon suppression + logo.
// ---------------------------------------------------------------------------
export async function purgeUser(ctx: MutationCtx, uid: Id<'users'>): Promise<void> {
  const del = async (docs: { _id: any }[]) => {
    for (const d of docs) await ctx.db.delete(d._id);
  };

  const ownedLeagues = await ctx.db
    .query('leagues')
    .withIndex('by_owner', (q) => q.eq('ownerId', uid))
    .collect();
  for (const lg of ownedLeagues) {
    const members = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', lg._id))
      .collect();
    const others = members.filter((m) => m.userId !== uid);
    if (others.length === 0) {
      if (lg.logoId) {
        try {
          await ctx.storage.delete(lg.logoId);
        } catch {
          /* déjà supprimé */
        }
      }
      await purgeLeagueReports(ctx, lg._id);
      await ctx.db.delete(lg._id);
    } else {
      const next = others.sort((a, b) => a.joinedAt - b.joinedAt)[0];
      await ctx.db.patch(lg._id, { ownerId: next.userId });
    }
  }

  await del(
    await ctx.db.query('leagueMembers').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
  );
  await del(await ctx.db.query('bets').withIndex('by_user', (q) => q.eq('userId', uid)).collect());
  await del(
    await ctx.db.query('flameTransactions').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
  );
  await del(
    await ctx.db.query('notifications').withIndex('by_user', (q) => q.eq('userId', uid)).collect(),
  );
  await del(await ctx.db.query('friends').withIndex('by_user', (q) => q.eq('userId', uid)).collect());
  await del(
    await ctx.db.query('friends').withIndex('by_friend', (q) => q.eq('friendId', uid)).collect(),
  );
  // Modération : blocages (2 sens) + signalements émis ou visant l'utilisateur.
  await del(await ctx.db.query('blocks').withIndex('by_blocker', (q) => q.eq('blockerId', uid)).collect());
  await del(await ctx.db.query('blocks').withIndex('by_blocked', (q) => q.eq('blockedId', uid)).collect());
  await del(await ctx.db.query('reports').withIndex('by_reporter', (q) => q.eq('reporterId', uid)).collect());
  await del(
    await ctx.db.query('reports').withIndex('by_target_user', (q) => q.eq('targetUserId', uid)).collect(),
  );

  await ctx.db.delete(uid);
}
