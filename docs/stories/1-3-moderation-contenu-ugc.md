# Story 1.3 : Modération du contenu utilisateur (UGC) — signaler, bloquer, filtrer

Status: ready-for-review — implémenté + revue adversariale + correctifs (2026-07-03)

<!-- Créée hors scaffolding BMAD (projet sans epics/sprint-status). Auto-suffisante pour dev-story. -->
<!-- Références de code obtenues par analyse exhaustive du repo (schema, users/friends/leagues/leaderboard, UI). -->

## Story

As a **éditeur de Djassa Foot (YGYHUB) et joueur**,
I want que l'application fournisse les **mécanismes de modération du contenu utilisateur exigés par les stores** — **signaler**, **bloquer** un joueur, **filtrer** les pseudos/noms de ligue offensants, et un **outil admin** pour agir sous 24 h,
so that l'app soit **conforme à Apple App Review Guideline 1.2 (UGC)** et à la **Google Play User-Generated Content policy**, et que les joueurs soient protégés des contenus/comportements abusifs.

## Contexte & problème

Dès qu'une app contient du **contenu créé par les utilisateurs visible par d'autres**, Apple (**guideline 1.2**) et Google (**politique UGC**) imposent, sous peine de **refus**, quatre mécanismes :
1. **Filtrer** le contenu manifestement répréhensible (au moins un filtre automatique) ;
2. **Signaler** un contenu/utilisateur abusif (mécanisme in-app) ;
3. **Bloquer** un utilisateur abusif ;
4. **Agir sous 24 h** sur les signalements (retrait du contenu + éjection de l'auteur) + **contact** publié.

**Surfaces UGC de Djassa Foot** (contenu visible par d'autres joueurs) :
- **Pseudo** `users.username` — visible partout (classement global, ligues, recherche d'amis, profil public).
- **Avatar** (image issue de Clerk/Google).
- **Nom de ligue** `leagues.name` — visible par les membres.
- **Logo de ligue** `leagues.logoId` — **image importée du téléphone** (surface la plus à risque).
- **Système d'amis** (demandes, interactions).

**État actuel = AUCUNE modération** (vérifié : `grep` de `report/block/signaler/bloquer/moderation` = 0 résultat dans `convex/` et `src/`). Le nom de ligue est seulement `trim()` + coupé à 40 caractères (`convex/leagues.ts:62`), sans filtre. Le pseudo vient de Clerk sans aucune validation (`convex/users.ts:54-62`).

**Déjà en place** : engagement de modération dans les **CGU §5** (« Nous pouvons modérer, modifier ou supprimer tout contenu… pour signaler… écris-nous à **Danielyaogle@gmail.com** ») et l'adresse de contact publiée (pages légales finalisées). La couche **CGU/contact** de la 1.2 est donc **déjà couverte** ; cette story livre les **mécanismes techniques** manquants.

## Documentation EXHAUSTIVE — exigences 1.2 ↔ ce qui manque

| Exigence store | Couvert aujourd'hui ? | À livrer dans cette story |
|---|---|---|
| Filtrer le contenu répréhensible | ❌ | Filtre de mots (fr/en) sur **pseudo** (`users.store`) + **nom de ligue** (`leagues.create`) |
| Signaler | ❌ | Table `reports` + mutation `report` + boutons « Signaler » (profil joueur & ligue) |
| Bloquer | ❌ | Table `blocks` + mutations `block/unblock` + « Bloquer » (profil joueur) + écran « Comptes bloqués » |
| Agir sous 24 h | ❌ | Fonctions **admin** (internal, via `npx convex run`) : lister les signalements, résoudre, **bannir** (cascade), renommer/supprimer une ligue |
| Contact publié + CGU | ✅ (CGU §5 + email) | — (rappel possible dans l'UI) |

## Scope MVP (validé avec l'utilisateur — ne PAS sur-scoper)

**DANS le scope :**
- **Signaler** un **joueur** (depuis son profil public) et une **ligue** (depuis la page ligue), avec un motif.
- **Bloquer / débloquer** un joueur ; le bloqué **disparaît** de mes classements, recherche, amis, et **ne peut plus** m'envoyer de demande d'ami ; **écran de gestion** des comptes bloqués (obligatoire : l'utilisateur doit pouvoir débloquer).
- **Filtre de mots** (liste noire fr/en réutilisable) sur pseudo + nom de ligue.
- **Outil admin minimal** exécutable en ligne de commande (`npx convex run`) : lister/résoudre les signalements, bannir un compte (réutilise la cascade de `deleteMyAccount`), renommer/supprimer une ligue.

**HORS scope (évolutions documentées, non bloquantes stores) :**
- Écran d'administration **in-app** (l'admin passe par la CLI Convex pour le MVP).
- **Modération d'image** automatisée du logo de ligue (le signalement + retrait manuel suffit pour la 1.2 ; l'auto-scan d'image est une évolution).
- Filtrage du pseudo **au niveau Clerk** (on filtre côté Convex, qui est autoritatif ; durcissement Clerk = évolution).
- Masquer un membre bloqué **à l'intérieur d'une ligue commune** est INCLUS mais volontairement simple (voir T3 / Q2).

## Décisions produit / règles retenues

- **R1 — Le bloc est bidirectionnel pour la visibilité.** Si A bloque B, alors A ne voit plus B **et** B ne voit plus A dans les classements/recherche/amis. Cela évite le contournement et protège les deux sens.
- **R2 — Bloquer implique « ne plus être amis ».** `block(B)` supprime toute relation `friends` A↔B existante (acceptée ou en attente).
- **R3 — Le filtre de pseudo n'échoue jamais le login.** Le pseudo venant de Clerk (non éditable in-app), si le pseudo Clerk contient un mot banni, `users.store` le **remplace** par un pseudo neutre (`Joueur`) au lieu de lever une erreur (sinon on casserait l'authentification). Le filtre de **nom de ligue**, lui, **rejette** (throw) car c'est une saisie in-app corrigeable.
- **R4 — L'admin est autoritatif et hors app.** Les actions de modération (bannir, supprimer/renommer une ligue, résoudre un signalement) sont des **fonctions `internal`** appelées via `npx convex run` (accès réservé au détenteur de la clé Convex = l'éditeur), cohérent avec les crons/fonctions internes déjà utilisées dans le projet. Pas de rôle admin en base pour le MVP.
- **R5 — Anti-spam.** Un seul signalement `pending` par (rapporteur, cible) ; un seul `block` par (bloqueur, bloqué) — dédup côté mutation.

## Acceptance Criteria

1. **Signaler un joueur** — Depuis le profil public d'un autre joueur (`src/app/(app)/user/[id].tsx`), un bouton **« Signaler »** ouvre un choix de motif puis enregistre un `reports` (`targetType:'user'`).
   - Given je consulte le profil d'un autre joueur, When je touche « Signaler » et choisis un motif, Then un document `reports` est créé (`reporterId=moi`, `targetUserId=lui`, `reason`, `status:'pending'`) et un message de confirmation s'affiche.
   - Given j'ai déjà un signalement `pending` sur ce joueur, When je re-signale, Then aucun doublon n'est créé (message « déjà signalé »).
   - Given c'est **mon** profil, Then le bouton « Signaler » n'apparaît pas.
2. **Signaler une ligue** — Depuis la page ligue (`src/app/(app)/league/[id].tsx`), une action **« Signaler la ligue »** enregistre un `reports` (`targetType:'league'`, `targetLeagueId`).
3. **Bloquer / débloquer** — Depuis le profil public, **« Bloquer ce joueur »** (confirmation) crée un `blocks` et supprime la relation d'amitié éventuelle (R2).
   - Given j'ai bloqué B, Then B **n'apparaît plus** dans : mon classement global, mon classement amis, ma recherche d'utilisateurs, mes demandes d'amis reçues (R1, bidirectionnel).
   - Given j'ai bloqué B, When B tente de m'envoyer une demande d'ami (ou moi lui), Then la mutation `sendRequest` **échoue** proprement (throw).
   - Given j'ai bloqué B, When j'ouvre le profil de B, Then l'UI affiche **« Débloquer »** (pas les actions d'ami), et `publicProfile` renvoie `relationship:'none'` + `iBlockedThem:true`.
   - Given je débloque B, Then B réapparaît normalement (mais l'amitié n'est PAS restaurée).
4. **Écran « Comptes bloqués »** — Accessible depuis le Profil ; liste `myBlocks` avec un bouton **« Débloquer »** par ligne. (Exigé : l'utilisateur doit pouvoir gérer/annuler ses blocages.)
5. **Filtre de mots** —
   - Given je crée une ligue nommée avec un mot banni (fr/en), When `leagues.create`, Then throw « Ce nom n'est pas autorisé. » et **aucune** ligue créée (R3).
   - Given un pseudo Clerk contient un mot banni, When `users.store` (création OU mise à jour), Then le pseudo stocké est **neutralisé** (`Joueur`), sans erreur de login (R3).
6. **Outil admin (CLI)** — Des fonctions `internal` permettent, via `npx convex run` : lister les signalements `pending` (avec cible), **résoudre/rejeter** un signalement, **bannir** un joueur (cascade identique à `deleteMyAccount`), **renommer** ou **supprimer** une ligue. Documenté dans les Dev Notes.
7. **Aucune régression** — Les flux existants (amis, ligues, classements, création de ligue avec nom valide) fonctionnent comme avant pour les utilisateurs non bloqués / contenus valides. `npx tsc --noEmit`, `npx convex codegen`, `npm run build` restent verts.

## Tasks / Subtasks

- [ ] **T1 — Schéma : tables `reports` + `blocks`** (AC: 1,2,3) — `convex/schema.ts`
  - [ ] `reports`: `reporterId: v.id('users')`, `targetType: v.union(v.literal('user'), v.literal('league'))`, `targetUserId: v.optional(v.id('users'))`, `targetLeagueId: v.optional(v.id('leagues'))`, `reason: v.string()`, `details: v.optional(v.string())`, `status: v.union(v.literal('pending'), v.literal('reviewed'), v.literal('dismissed'))`, `createdAt: v.number()`. Index : `.index('by_status', ['status'])`, `.index('by_reporter', ['reporterId'])`, `.index('by_target_user', ['targetUserId'])`, `.index('by_target_league', ['targetLeagueId'])`.
  - [ ] `blocks`: `blockerId: v.id('users')`, `blockedId: v.id('users')`, `createdAt: v.number()`. Index : `.index('by_blocker', ['blockerId'])`, `.index('by_blocked', ['blockedId'])`, `.index('by_blocker_blocked', ['blockerId', 'blockedId'])`.
  - [ ] Respecter le style existant (`defineTable({...}).index(...)`, `v.*`, conventions `by_<champ>` — cf. `convex/schema.ts:1-2` et tables `friends` 133-140 / `leagueMembers` 246-253).
- [ ] **T2 — Filtre de mots partagé** (AC: 5) — nouveau `convex/moderation.ts` (ou `convex/lib/profanity.ts`)
  - [ ] `BANNED: string[]` — liste noire fr/en (insultes, haine, sexuel explicite). Départ raisonnable, **à faire relire/étendre par le PO**.
  - [ ] `isNameAllowed(name: string): boolean` — normalise (minuscule, sans accents, sans séparateurs `l33t` basiques) puis teste la présence d'un mot banni en **frontière de mot** pour limiter les faux positifs (« Scunthorpe problem »).
  - [ ] Hook **ligue** : `convex/leagues.ts:62`, juste après `const clean = name.trim().slice(0,40);` et avant l'insert (67) → `if (!isNameAllowed(clean)) throw new Error('Ce nom n'est pas autorisé.');`
  - [ ] Hook **pseudo** : `convex/users.ts` — dans `store`, neutraliser avant l'insert (ligne 62) ET avant le patch (46) : si `!isNameAllowed(username)` → `username = 'Joueur'` (idem pour `nextName`). Ne PAS throw (R3).
- [ ] **T3 — Backend blocage** (AC: 3,4) — `convex/moderation.ts` + points d'enforcement
  - [ ] `block` mutation `{ userId: v.id('users') }` : `me = currentUser`; refuser self-block ; dédup via `by_blocker_blocked` ; **supprimer les relations `friends` me↔userId** dans les 2 sens (R2) ; insérer `blocks`.
  - [ ] `unblock` mutation `{ userId }` : supprimer le `blocks` (`by_blocker_blocked`).
  - [ ] `myBlocks` query : liste des users que j'ai bloqués (id, username, avatarUrl) — pour l'écran T6d.
  - [ ] Helper partagé `blockedUserIds(ctx, meId): Promise<Set<Id<'users'>>>` = union des `blockedId` (où `blockerId=me`) **et** des `blockerId` (où `blockedId=me`) → bidirectionnel (R1).
  - [ ] **Enforcement** (filtrer/masquer avec ce Set) :
    - `convex/friends.ts › sendRequest` (~111-113, après `const friend = await ctx.db.get(friendId)`) → si bloqué (2 sens) `throw new Error('Action impossible.')`.
    - `convex/friends.ts › searchUsers` (résultats ~54-66) → exclure les bloqués.
    - `convex/friends.ts › listPendingRequests` (~84-98) → exclure les expéditeurs bloqués.
    - `convex/leaderboard.ts › global` (14-23) → filtrer la liste renvoyée.
    - `convex/leaderboard.ts › friends` (~53-60) → filtrer.
    - `convex/leagues.ts › detail` (membres ~289-301) → exclure les membres bloqués (Q2 : on masque la ligne ; le `memberCount` peut rester le total réel — à trancher).
    - `convex/users.ts › publicProfile` (~96) → si bloqué (2 sens), renvoyer `relationship:'none'` ; ajouter au retour `iBlockedThem: boolean` (pour l'UI T6).
- [ ] **T4 — Backend signalement** (AC: 1,2) — `convex/moderation.ts`
  - [ ] `report` mutation `{ targetType, targetUserId?, targetLeagueId?, reason: v.string(), details? }` : `me = currentUser` ; vérifier que la cible existe ; refuser l'auto-signalement de son propre profil ; **dédup** : pas de doublon `pending` pour (reporterId, même cible) via `by_reporter` filtré ; insérer `status:'pending', createdAt`.
- [ ] **T5 — Admin (internal, via `npx convex run`)** (AC: 6) — `convex/moderation.ts`
  - [ ] `listReports` **internalQuery** : renvoie les `reports` `pending` (index `by_status`) enrichis (username/nom de ligue de la cible, username du rapporteur).
  - [ ] `resolveReport` **internalMutation** `{ reportId, status: 'reviewed'|'dismissed' }`.
  - [ ] `banUser` **internalMutation** `{ userId }` : **généraliser la cascade de `deleteMyAccount`** (`convex/users.ts:138-195`) pour un `userId` donné (au lieu de `currentUser`) : ligues possédées (transfert/suppression + logo), `leagueMembers`, `bets`, `flameTransactions`, `notifications`, `friends` (2 sens), `blocks` (2 sens), `reports` liés, puis `users`. ⚠️ La suppression du **compte Clerk** correspondant se fait à la main dans le dashboard Clerk (le noter).
  - [ ] `renameLeague` **internalMutation** `{ leagueId, name }` (passe par `isNameAllowed`) et `deleteLeague` **internalMutation** `{ leagueId }` (supprime membres + logo + ligue).
  - [ ] Refactor : extraire la cascade de suppression user dans un helper interne réutilisé par `deleteMyAccount` **et** `banUser` (éviter la duplication).
- [ ] **T6 — UI** (AC: 1,2,3,4)
  - [ ] **a. Profil public** `src/app/(app)/user/[id].tsx` (zone d'actions ~106-116, à côté du bouton d'ami) : ajouter **« Signaler »** (ouvre un sélecteur de motif) et **« Bloquer ce joueur »** / **« Débloquer »** (selon `iBlockedThem`). Réutiliser le **pattern de confirmation rouge** de `profile.tsx:277-313` (carte `border-red/40`, bouton `#E5484D`, « Annuler »). Câbler `api.moderation.report` / `block` / `unblock`.
  - [ ] **b. Motifs de signalement** : petit set de chips fr — « Contenu offensant / haineux », « Harcèlement », « Spam », « Usurpation d'identité », « Autre ».
  - [ ] **c. Page ligue** `src/app/(app)/league/[id].tsx` (header ~155-175, modèle = bouton partage 166-171) : action **« Signaler la ligue »** (icône `ellipsis-horizontal` ou entrée sous la carte d'identité 189-259) → `report` `targetType:'league'`.
  - [ ] **d. Écran « Comptes bloqués »** : nouveau `src/app/(app)/blocked.tsx` listant `api.moderation.myBlocks` avec « Débloquer » par ligne ; ajouter une entrée dans la section « Compte » du Profil (`profile.tsx`, près de « Se déconnecter » ~250-291).
  - [ ] Composants à réutiliser : `BrutalButton` (variants `ghost`/`primary`), `BrutalBox`, `Ionicons`. Pas de lib de modale → confirmations par **rendu conditionnel + `useState`** (comme `profile.tsx`).
- [ ] **T7 — (Optionnel) CGU** — mention légère « Tu peux signaler ou bloquer un joueur depuis l'app » dans CGU §5 (`public/conditions-utilisation/index.html`). Non bloquant.
- [ ] **T8 — Vérif** (AC: 7) — `npx tsc --noEmit`, `npx convex codegen`, `npm run build` verts ; tests manuels : (1) signaler un joueur puis `npx convex run moderation:listReports` le montre ; (2) bloquer un joueur → il disparaît du classement/recherche et `sendRequest` échoue ; (3) créer une ligue avec un mot banni → refus ; (4) débloquer → réapparition.

## Dev Notes

### Modèle de données (rappel des faits, `convex/schema.ts`)
- Imports (1-2) : `defineSchema, defineTable` + `v`. FK via `v.id('table')`. Convention d'index `by_<champ>` (single) / `by_<t>_<champ>` (composite).
- Tables concernées : `users` (6-21 ; `by_token`, `by_flames`, `by_username`), `friends` (133-140 ; `by_user`, `by_friend`), `leagues` (234-243 ; `by_code`, `by_owner`), `leagueMembers` (246-253), `notifications` (142-151), `bets` (96-131 ; `by_user`).
- **Pas d'unicité de pseudo** garantie aujourd'hui (l'index `by_username` existe mais `store` ne déduplique pas) → neutraliser un pseudo vers `Joueur` est sans risque de collision bloquante.

### Points d'insertion backend (exacts)
- **Pseudo (source unique = Clerk)** : `convex/users.ts › store` — pseudo calculé 54-58, inséré 62, patché à chaque login 43-48. Le pseudo **n'est pas éditable in-app** (aucune mutation de rename ; sign-up n'a pas de champ pseudo — cf. `src/app/(auth)/sign-up.tsx`). Donc **Convex `store` est le seul garde autoritatif** → y placer la neutralisation (R3).
- **Nom de ligue** : `convex/leagues.ts › create` nettoyage 62, insert 67. **Aucune mutation de rename** n'existe (seuls `setLogo` 105, `removeLogo` 126, `leave` 188 patchent) → un seul point de filtre suffit.
- **Blocage (enforcement)** — le helper `blockedUserIds` doit être appliqué dans les **7** points listés en T3. Bidirectionnel obligatoire (R1) : interroger `blocks` via `by_blocker` (mes blocages) **et** `by_blocked` (ceux qui m'ont bloqué).
- **`sendRequest`** (`convex/friends.ts:103-150`) vérifie déjà l'absence de relation existante (2 sens) — insérer le check bloc juste après `const friend = await ctx.db.get(friendId)` (~111).
- **`publicProfile`** (`convex/users.ts:81-132`) calcule `relationship`/`relationshipId` (94-116) — le check bloc doit **précéder** cette logique (retour anticipé `relationship:'none'` + `iBlockedThem`).

### Admin sans rôle en base (pattern projet)
- Le projet exécute déjà des fonctions **internes** via `npx convex run <module>:<fn>` (crons, ingestion). Les fonctions admin de T5 sont des `internalQuery`/`internalMutation` → **non exposées au client**, seulement appelables avec la clé Convex (l'éditeur). Suffisant pour l'exigence « agir sous 24 h » sans construire d'écran admin.
- Exemples d'appels (à documenter pour l'éditeur) :
  - `npx convex run moderation:listReports` → voir les signalements en attente.
  - `npx convex run moderation:banUser '{"userId":"<id>"}'` → bannir (puis supprimer le compte dans le **dashboard Clerk**).
  - `npx convex run moderation:deleteLeague '{"leagueId":"<id>"}'` / `moderation:renameLeague '{"leagueId":"<id>","name":"..."}'`.
  - `npx convex run moderation:resolveReport '{"reportId":"<id>","status":"reviewed"}'`.
- **Réutiliser la cascade** de `deleteMyAccount` (`convex/users.ts:138-195`) : extraire un helper `purgeUser(ctx, uid)` appelé par `deleteMyAccount` ET `banUser` (ne pas dupliquer ; ajouter la purge des nouveaux `blocks`/`reports` dans le helper).

### UI — patterns à copier
- **Confirmation destructive rouge** : `src/app/(app)/(tabs)/profile.tsx:277-313` (état `useState`, carte `border-red/40 bg-surface p-4`, bouton `#E5484D`, « Annuler » discret). Miroir pour « Bloquer » et pour la confirmation « Signaler ».
- **En-tête avec action icône** : `src/app/(app)/league/[id].tsx:155-175` (bouton partage 166-171) = modèle pour « Signaler la ligue ».
- **Zone d'actions du profil public** : `src/app/(app)/user/[id].tsx:106-116` (bouton d'ami) = emplacement des nouveaux boutons.
- Composants : `src/components/brutal/BrutalButton.tsx` (variants `primary/light/green/ghost`, props `label/variant/onPress/disabled/loading/full`), `src/components/brutal/BrutalBox.tsx`, `Ionicons` (`@expo/vector-icons`). **Aucune lib de modale** → confirmations en rendu conditionnel.

### Décision produit
- **Filtre de mots** : approche liste-noire simple, volontairement conservatrice (frontières de mot) pour éviter les faux positifs. C'est un filet, pas une IA de modération — cohérent avec l'exigence « au moins un filtre » de la 1.2. La liste doit être **relue/étendue par le PO**.
- **Image du logo de ligue** : non filtrée automatiquement dans le MVP. La conformité 1.2 est atteinte via **signalement → retrait manuel** (T5). Auto-modération d'image = évolution (coût/API).
- **Masquage intra-ligue** (Q2) : hider la ligne d'un membre bloqué dans `leagues.detail` est inclus ; reste à décider si le `memberCount` affiché reste le total réel (recommandé, plus simple) ou le total filtré.

### Testing standards
- Pas de framework de test configuré (aucun `jest`/`vitest` dans `package.json`). Comme pour la 1.1 : privilégier un **script de vérif autonome** (`node`/`tsx` dans `scripts/`) pour `isNameAllowed` (mots bannis rejetés / mots normaux acceptés / faux positifs type « Scunthorpe » évités), + **tests manuels** pour le blocage et le signalement (les mutations dépendent de l'auth Convex, difficiles à unit-tester sans harnais).
- Vérif build : `npx tsc --noEmit` + `npx convex codegen` + `npm run build` verts.

### Project Structure Notes
- Nouveau fichier backend : `convex/moderation.ts` (report/block/unblock/myBlocks + helper `blockedUserIds` + `isNameAllowed`/`BANNED` + fonctions admin internal). Option : sortir la liste de mots dans `convex/lib/profanity.ts`.
- Nouveau schéma : tables `reports` + `blocks` dans `convex/schema.ts`.
- Fichiers modifiés : `convex/users.ts` (neutralisation pseudo + `publicProfile` bloc + extraction `purgeUser`), `convex/friends.ts` (3 points bloc), `convex/leaderboard.ts` (2 points bloc), `convex/leagues.ts` (filtre nom).
- Nouvelle UI : `src/app/(app)/blocked.tsx` ; modifiés : `src/app/(app)/user/[id].tsx`, `src/app/(app)/league/[id].tsx`, `src/app/(app)/(tabs)/profile.tsx` (entrée « Comptes bloqués »).
- Sécurité : aucune de ces fonctions ne manipule de secret ; garder le contrôle « zéro secret » avant commit. `report`/`block` sont des mutations **publiques authentifiées** (client) ; les fonctions admin sont **internal** (jamais exposées au client).

### References
- Schéma : [convex/schema.ts](../../convex/schema.ts) (users 6-21, friends 133-140, leagues 234-243, leagueMembers 246-253, notifications 142-151).
- Users : [convex/users.ts](../../convex/users.ts) (`store` 30-78 / pseudo 54-62, `publicProfile` 81-132, `deleteMyAccount` 138-195).
- Amis : [convex/friends.ts](../../convex/friends.ts) (`searchUsers` 16-68, `listPendingRequests` 71-100, `sendRequest` 103-150).
- Classements : [convex/leaderboard.ts](../../convex/leaderboard.ts) (`global` 14-23, `friends` 26-65).
- Ligues : [convex/leagues.ts](../../convex/leagues.ts) (`create` 57-75 / clean 62, `detail` 275-314 / membres 289-301).
- Profil public UI : [src/app/(app)/user/[id].tsx](../../src/app/(app)/user/%5Bid%5D.tsx) (actions 106-116).
- Ligue UI : [src/app/(app)/league/[id].tsx](../../src/app/(app)/league/%5Bid%5D.tsx) (header 155-175, membres 269-311).
- Pattern de confirmation rouge : [src/app/(app)/(tabs)/profile.tsx](../../src/app/(app)/(tabs)/profile.tsx) (277-313).
- CGU (engagement modération + contact) : [public/conditions-utilisation/index.html](../../public/conditions-utilisation/index.html) (§5).

## Décisions PO (tranchées 2026-07-03)
- **Q1** → outil admin **en CLI** (`npx convex run`), **pas** d'écran admin in-app.
- **Q2** → on **masque la ligne** du membre bloqué dans le classement de ligue ; le `memberCount` reste le **total réel**.
- **Q3** → neutralisation du pseudo **côté Convex** (fallback « Joueur »), durcissement Clerk plus tard.
- **Q4** → liste de mots fr/en raisonnable, **à relire/étendre par le PO** ensuite.

### Questions initiales (pour mémoire)
- **Q1 — Admin :** OK pour un outil admin **en CLI** (`npx convex run`) au MVP, ou tu veux un **écran admin in-app** dès maintenant ? (Reco : CLI pour le MVP.)
- **Q2 — Ligue commune :** quand je bloque un membre d'une de mes ligues, on **masque sa ligne** du classement de ligue mais le `memberCount` reste le total réel (reco), ou on masque tout ? 
- **Q3 — Pseudo :** on neutralise côté Convex (fallback `Joueur`) sans casser le login (reco), et durcissement Clerk plus tard — OK ?
- **Q4 — Liste de mots :** je pars sur une liste noire fr/en raisonnable que tu relis ensuite — OK ? (Y a-t-il des mots/argot ivoiriens spécifiques à inclure ?)

## Dev Agent Record

### Agent Model Used

claude-opus-4-8

### Debug Log References

- `npx tsx scripts/verify-moderation.ts` → **24/24** (10 pseudos/ligues valides acceptés dont « unique/clinique/escalope/Scunthorpe » ; 14 refusés dont profanité fr/en, leetspeak `n1gger`, concaténations `FuckLucas`/`shitpost`).
- `npx convex codegen` ✅ · `npx tsc --noEmit` ✅ · `npm run build` ✅.
- **Revue adversariale** (workflow 3 dimensions × vérification) : 8 constats confirmés / 3 réfutés → tous les confirmés corrigés (voir Completion Notes).

### Completion Notes List

- **Schéma** : tables `reports` (targetType user|league) + `blocks` (bidirectionnel), index idiomatiques.
- **Backend** `convex/moderation.ts` : `block`/`unblock`/`myBlocks`/`report` (publics) + `listReports`/`resolveReport`/`banUser`/`renameLeague`/`deleteLeague` (**internal**, via `npx convex run`). Helpers partagés `convex/moderationLib.ts` : `isNameAllowed` (liste noire fr/en, token + sous-chaîne, anti-Scunthorpe), `blockedUserIds` (union 2 sens), `purgeUser`/`purgeLeagueReports`.
- **Enforcement blocage** : friends (searchUsers/listPendingRequests/sendRequest), leaderboard (global/friends), leagues.detail (masque le membre, `memberCount` = total réel), **bets.forUser** (gate), users.publicProfile (flag `blocked` + stats neutralisées).
- **Filtre pseudo** neutralisé côté Convex (`users.store`, jamais de throw → login préservé) ; **nom de ligue** rejeté (`leagues.create` + admin `renameLeague`).
- **UI** : profil public (Signaler/Bloquer/Débloquer + profil masqué si bloqué 2 sens), page ligue (Signaler la ligue), écran `blocked.tsx` + entrée Profil.
- **Corrigé après revue adversariale** : (1) `bets.forUser` exposait l'historique d'un joueur bloqué → gate ; (2) `publicProfile` renvoyait le profil complet même bloqué (sens « il m'a bloqué ») → flag `blocked` + stats neutralisées + UI « profil indisponible » (supprime le bouton ami mort) ; (3) filtre contournable par concaténation EN (`FuckLucas`) → racines EN en sous-chaîne ; (4) reports de ligue orphelins → `purgeLeagueReports` à chaque suppression de ligue.
- **Résiduels assumés (hors scope MVP)** : pas d'auto-modération d'image du logo (signalement→retrait admin) ; `dick`/`cunt`/`rape`/`sex` gardés en token seul (éviter Dickson/Scunthorpe/grape/Sussex) → concaténations avec ces racines non attrapées, liste à étendre par le PO ; suppression du compte Clerk lors d'un ban = manuelle (dashboard).

### File List

- `convex/schema.ts` (tables reports + blocks)
- `convex/moderationLib.ts` (nouveau — isNameAllowed, blockedUserIds, purgeUser, purgeLeagueReports)
- `convex/moderation.ts` (nouveau — block/unblock/myBlocks/report + admin internal)
- `convex/users.ts` (neutralisation pseudo, publicProfile blocked+iBlockedThem, deleteMyAccount→purgeUser)
- `convex/friends.ts` (blocage : searchUsers, listPendingRequests, sendRequest)
- `convex/leaderboard.ts` (blocage : global, friends)
- `convex/leagues.ts` (filtre nom, detail masque membre bloqué, purgeLeagueReports)
- `convex/bets.ts` (forUser : gate blocage)
- `src/app/(app)/user/[id].tsx` (Signaler/Bloquer/Débloquer + profil masqué si bloqué)
- `src/app/(app)/league/[id].tsx` (Signaler la ligue)
- `src/app/(app)/blocked.tsx` (nouveau — écran Comptes bloqués)
- `src/app/(app)/(tabs)/profile.tsx` (entrée « Comptes bloqués »)
- `scripts/verify-moderation.ts` (nouveau — test du filtre de mots)
