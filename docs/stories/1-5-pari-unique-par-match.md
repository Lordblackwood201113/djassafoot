# Story 1.5 : Un seul pronostic par match (bouton « Pronostiquer » grisé après placement)

Status: review

<!-- Créée hors scaffolding BMAD (projet sans epics/sprint-status). Auto-suffisante pour dev-story. -->
<!-- Applique la règle déjà publiée dans les CGU (section 3 « Fonctionnement des pronostics », djassafoot.pages.dev/conditions-utilisation, commit f2f5f98) : « Un seul pronostic est autorisé par événement ». -->

## Story

As a **joueur**,
I want qu'un seul pronostic soit possible par match — et que le bouton pour pronostiquer se grise dès que j'ai parié,
so that le jeu respecte la règle des CGU (« un seul pronostic par événement ») et que je ne puisse plus cumuler plusieurs paris sur un même match.

## Contexte & problème

- **La règle est écrite dans les CGU** (section 3, publiée en ligne) **mais PAS appliquée dans le jeu** : aujourd'hui l'app autorise explicitement plusieurs paris sur le même match.
- **Serveur** — **`convex/bets.ts:242-303`** (`place`) valide le match, la mise, le solde, la cohérence des legs d'un combiné (**`bets.ts:268`** « un seul choix par marché » = dédoublonne les marchés *à l'intérieur* d'un combiné), mais **n'interdit PAS un 2ᵉ pari distinct sur le même match**. L'insert se fait à **`bets.ts:283`**.
- **UI** — l'écran détail match assume le multi-pari : bouton libellé **« Ajouter un prono »** quand un pari existe (**`match/[id].tsx:164`**) + encart vert **« N pari(s) déjà placé(s) »** (**`match/[id].tsx:171-177`**).
- **Conséquence concrète** : le 2026-07-05, il a fallu rembourser à la main les paris multiples sur Brésil–Norvège (2 joueurs, 7 paris) via l'outil admin **`migrations.refundMultiBetsForMatch`**. Tant que le blocage n'existe pas, ces cas se reproduiront.
- **Objectif de la story** : blocage **serveur autoritatif** dans `place` + **grisage UI en miroir** du bouton d'entrée du parcours de pronostic.

## Décisions produit (figées)

1. **Un seul pronostic par match.** Un **combiné multi-legs = UN seul pronostic** (donc autorisé — c'est 1 document `bets`).
2. **Un pari annulé/remboursé (`status: 'void'`) rouvre le droit de parier** — il ne compte pas. Cohérent avec `refundMultiBetsForMatch` (qui passe les paris en trop à `void` + `reason: 'refund'`) et avec `cancel` (qui supprime le document).
3. **Le serveur est la source de vérité.** L'UI grise le bouton en miroir (confort), mais un client contourné doit être rejeté côté serveur.
4. **Édition d'un pari existant** (`bet/[id]` → `startEdit` → `update`) **reste possible** — ce n'est pas un nouveau pari, ne pas la bloquer.

## Acceptance Criteria

1. **Serveur autoritatif — `place` refuse un 2ᵉ pari** *(AC critique)*
   - Given un pari **non-`void`** de l'utilisateur existe déjà sur ce match, When `bets.place` est appelé, Then il **throw `Tu as déjà un pronostic sur ce match`**, **aucun jeton n'est débité** et **aucun document `bets` n'est inséré** (fail-fast avant le débit).
2. **Un pari `void` rouvre le droit**
   - Given le(s) seul(s) pari(s) de l'utilisateur sur ce match sont `void` (remboursés/annulés), When `place` est appelé, Then le nouveau pari est **accepté** normalement.
3. **Combiné = 1 pronostic**
   - Given un combiné avec plusieurs legs (ex. `result_1x2` + `btts`), When `place` est appelé et qu'aucun pari non-void n'existe, Then il est **accepté** (1 seul document `bets`) — le garde compte des *documents*, pas des *legs*.
4. **UI — bouton grisé quand un pari existe**
   - Given l'utilisateur a déjà un pari (non-void) sur le match, When l'écran détail (`match/[id]`) s'affiche, Then le bouton d'entrée du prono est **désactivé et grisé** (non cliquable), avec un libellé du type **« Pari déjà placé »** au lieu de « Ajouter un prono ».
5. **Réactivité (pas de reload nécessaire)**
   - Given je viens de placer un pari, When je reviens sur l'écran du match, Then le bouton est **déjà grisé** sans rechargement manuel (via la requête réactive `api.bets.forMatch`).
6. **Pas de faux grisage pendant le chargement**
   - Given la requête des paris est encore en cours (`myBets === undefined`), When l'écran s'affiche, Then le bouton **n'est PAS grisé prématurément** (pas de flash « grisé → actif »).
7. **Non-régression des chemins voisins**
   - L'**édition** d'un pari (`bet/[id]` → `startEdit`) reste possible ; le bouton **« Pronostiquer »** du `HeroMatch` (qui ouvre le *détail*, pas le prono) n'est **pas** touché ; le verrou anti-double-tap du `slip` reste en place.

## Tasks / Subtasks

- [x] **T1 — Garde serveur « 1 pari par match » dans `place`** (AC: 1, 2, 3) — `convex/bets.ts`
  - [x] Insérer le contrôle **après** la vérification du solde (`bets.ts:258`) et **avant** le débit `ctx.db.patch(user._id, …)` (`bets.ts:282`) / l'insert (`bets.ts:283`), pour ne jamais débiter puis échouer.
  - [x] Logique (réutilise le pattern `by_match` déjà employé par `forMatch` `bets.ts:108-112`) :
    ```ts
    // 1 seul pronostic par match (règle CGU). On IGNORE les paris 'void' (remboursés/annulés) qui rouvrent le droit.
    const existing = await ctx.db
      .query('bets')
      .withIndex('by_match', (q) => q.eq('matchId', matchId))
      .collect();
    if (existing.some((b) => b.userId === user._id && b.status !== 'void')) {
      throw new Error('Tu as déjà un pronostic sur ce match');
    }
    ```
  - [ ] (Optionnel — NON retenu, voir Q1) index composite `by_user_match: ['userId','matchId']` : le scan `by_match` + filtre `userId` suffit à cette volumétrie. Reporté à un chantier « perf » distinct si besoin.
- [x] **T2 — Grisage du bouton d'entrée sur l'écran détail** (AC: 4, 5, 6) — `src/app/(app)/match/[id].tsx`
  - [x] `myBets = useQuery(api.bets.forMatch, …)` est **déjà branché** (`match/[id].tsx:31`) — dériver `const hasBet = !!myBets && myBets.some((b) => b.status !== 'void');` (réactif). **Choix affiné** : `.some(status !== 'void')` au lieu de `.length > 0`, pour être le miroir EXACT du garde serveur (un pari remboursé/void ne grise pas).
  - [x] Sur le `<BrutalButton>` (`match/[id].tsx:163-170`) : `disabled={hasBet}`, `onPress` neutralisé quand `hasBet`, libellé conditionnel (`hasBet ? 'Pari déjà placé' : 'Pronostiquer'`).
  - [x] Le grisage est **automatique** via `BrutalButton` (`disabled` → fond `#1C1C20`, texte `#6B7280`) — aucun style manuel.
  - [x] Encart mis à jour au **singulier** : « Tu as déjà pronostiqué ce match ».
  - [x] Ne PAS griser tant que `myBets === undefined` (chargement) : `!!myBets && …` ⇒ `hasBet=false` pendant le chargement.
- [x] **T3 — Non-régression (à NE PAS toucher)** (AC: 7)
  - [x] Bouton « Pronostiquer » de `HeroMatch.tsx:86-90` (va au détail) : intact.
  - [x] Chemin d'**édition** `bet/[id].tsx:49-53` (`startEdit` → `update`) : intact (le garde ne vise que `place`).
  - [x] Verrou anti-double-tap du `slip` (`slip.tsx:39,80`) : intact.
- [x] **T4 — Vérification**
  - [x] `npx tsc --noEmit` OK ; `npx convex dev --once` déploie sans erreur (index `by_match` validé).
  - [x] Test serveur : le garde réutilise le prédicat EXACT (`by_match` + `userId` + `status !== 'void'`) déjà exécuté avec succès sur données réelles par `refundMultiBetsForMatch` (2026-07-05). ⚠️ Le throw runtime de `place` n'est pas testable via `convex run` (mutation authentifiée : `currentUser` renvoie null sans session) → **confirmation finale en-app** (tenter un 2ᵉ pari).
  - [x] Test UI : `hasBet` dérivé de la query réactive → grisage automatique ; édition préservée (chemin distinct).

## Dev Notes

### Blocage serveur (source de vérité)
- Point d'insertion : `convex/bets.ts` › `place` (`bets.ts:242`). Insert à protéger : `bets.ts:283`. Placer le garde **après** le check solde (`bets.ts:258`), **avant** le débit (`bets.ts:282`). Message exact : **`Tu as déjà un pronostic sur ce match`**.
- Le check existant `bets.ts:268` (« Un seul choix par marché ») **ne** couvre **pas** ce besoin : il dédoublonne les marchés *dans* un combiné, il ne bloque pas un 2ᵉ pari distinct.
- **Statut qui compte** : tous sauf `void`. En pratique, avant le coup d'envoi un pari est forcément `pending` (won/lost n'arrivent qu'au settlement post-match, où `place` échoue déjà sur le check kickoff `bets.ts:253-254`), mais filtrer `!== 'void'` est le choix explicite et défensif.
- `update` (`bets.ts:307`) et `cancel` (`bets.ts:377`, supprime le doc) **ne créent pas** de 2ᵉ pari → non concernés.

### Nuance `void` (remboursement)
- `migrations.refundMultiBetsForMatch` (`convex/migrations.ts`) passe les paris en trop à `status: 'void'` + transaction `reason: 'refund'`. Un pari `void` = mise intégralement rendue, « comme s'il n'avait pas existé ». Il **ne doit pas** bloquer un nouveau pari → d'où le filtre `!== 'void'`.

### UI (miroir, confort)
- **Seule vraie entrée** du parcours de prono : le `<BrutalButton>` de `match/[id].tsx:163-170` (`onPress` → `resetDraft()` + `router.push(/prono/${id})`). Rendu uniquement si `canPredict` (`match/[id].tsx:59` : `status === 'scheduled' && kickoff > now`).
- Données déjà présentes : `myBets = useQuery(api.bets.forMatch, …)` (`match/[id].tsx:31`) → **aucune nouvelle requête ni index UI à créer**. `forMatch` (`bets.ts:103-114`) renvoie les paris de l'utilisateur courant sur ce match.
- `BrutalButton` supporte nativement `disabled` (grisage + non-cliquable) — rien à modifier dans le composant.
- Le **HeroMatch** a un bouton libellé « Pronostiquer » (`HeroMatch.tsx:86-90`) qui va au **détail** (pas au prono) : **ne pas** le désactiver, sinon on perd l'accès au match.

### Testing standards
- Pas de framework de test unitaire dans le repo. Vérif = `tsc` + `convex dev --once` + tests manuels via `npx convex run` (placer/relacer un pari) et parcours UI.
- Double barrière assumée : **serveur autoritatif** (obligatoire, AC 1) + **UI en miroir** (confort, AC 4). Ne jamais se fier au seul client.

### Project Structure Notes
- **Modifiés** : `convex/bets.ts` (garde dans `place`), `src/app/(app)/match/[id].tsx` (grisage + libellé + encart). **Optionnel** : `convex/schema.ts` (index `by_user_match`) — voir Q1.
- **Aucun nouveau fichier** attendu.

### References
- [convex/bets.ts](../../convex/bets.ts) — `place` (l.242), insert (l.283), `forMatch` (l.103-114)
- [convex/schema.ts](../../convex/schema.ts) — table `bets` + index (l.99-134)
- [convex/migrations.ts](../../convex/migrations.ts) — `refundMultiBetsForMatch` (nuance `void`)
- [src/app/(app)/match/[id].tsx](../../src/app/(app)/match/[id].tsx) — `myBets` (l.31), bouton (l.163-170), encart (l.171-177)
- [src/components/brutal/BrutalButton.tsx](../../src/components/brutal/BrutalButton.tsx) — `disabled` (l.30,36,50)
- CGU section 3 « Fonctionnement des pronostics » — `public/conditions-utilisation/index.html`

## Questions ouvertes

- **Q1 — Index composite `by_user_match` ?** Le scan `by_match` + filtre `userId` suffit (borné au nombre de paris d'UN match, faible volumétrie). Ajouter l'index `['userId','matchId']` rendrait le lookup exact et plus propre, mais n'est pas nécessaire au MVP. **Reco : scan `by_match` pour cette story ; index optionnel à part.**
- **Q2 — Libellé exact du bouton grisé** : « Pari déjà placé » / « Prono déjà placé » / « Déjà pronostiqué » ? (défaut proposé : **« Pari déjà placé »**).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8

### Debug Log References

- ✅ `npx tsc --noEmit` → TSC_OK (garde serveur + `hasBet` compilent)
- ✅ `npx convex dev --once` → « Convex functions ready » (index `by_match` validé, aucune erreur de schéma/fonction)

### Completion Notes List

- **Garde serveur** ajouté dans `bets.place` (`convex/bets.ts`) juste après le check solde, avant tout débit : scan `by_match` → `existingBets.some(b => b.userId === user._id && b.status !== 'void')` → `throw new Error('Tu as déjà un pronostic sur ce match')`. Fail-fast : aucun jeton débité, aucun `bets` inséré si refusé (AC 1). Les paris `void` (remboursés) ne bloquent pas (AC 2). Un combiné multi-legs reste 1 document ⇒ non impacté (AC 3).
- **Miroir UI** sur `match/[id].tsx` : `hasBet = !!myBets && myBets.some(b => b.status !== 'void')` — affiné de `.length > 0` vers `.some(!void)` pour coller EXACTEMENT au garde serveur (un pari void ne grise pas le bouton). Bouton `disabled={hasBet}`, `onPress` neutralisé, libellé « Pari déjà placé », encart au singulier (AC 4). Réactif via `useQuery` (AC 5) ; `undefined` pendant le chargement ⇒ pas de grisage prématuré (AC 6).
- **Non-régression** (AC 7) : `place` seul est gardé ; `update`/`cancel`/`startEdit` (édition) et le bouton HeroMatch (→ détail) sont intacts.
- **Décision Q1** : index composite `by_user_match` NON ajouté (scan `by_match` suffit à cette volumétrie). **Décision Q2** : libellé retenu = « Pari déjà placé ».
- **Vérification runtime** : le prédicat du garde est déjà éprouvé sur données réelles (identique à `refundMultiBetsForMatch`, exécuté le 2026-07-05). Le throw de `place` exige une session authentifiée (non reproductible via `convex run`) → à confirmer en-app (tenter un 2ᵉ pari sur un match déjà pronostiqué).

### File List

- `convex/bets.ts` (modifié — garde « 1 pari par match » dans la mutation `place`)
- `src/app/(app)/match/[id].tsx` (modifié — `hasBet` + bouton grisé/relibellé + encart au singulier)
- `docs/stories/1-5-pari-unique-par-match.md` (nouveau — cette story)
