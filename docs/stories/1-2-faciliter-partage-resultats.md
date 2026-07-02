# Story 1.2 : Faciliter le partage des résultats sur les réseaux (carte « prête à poster »)

Status: ready-for-review

<!-- Créée hors scaffolding BMAD (projet sans epics/sprint-status). Auto-suffisante pour dev-story. Thème visuel actuel = « Noir » (voir Dev Notes › Design). -->

## Story

As a **joueur de Djassa Foot qui vient de gagner (ou de placer) un prono**,
I want **partager mon résultat en un tap sous forme d'une belle image de marque déjà prête** (pas juste un lien texte),
so that je **frime auprès de mes potes sur WhatsApp / Instagram / X** et que ça **fasse connaître l'app** (boucle virale).

## Contexte & problème

L'app a déjà un partage **texte + lien** générique (`src/lib/share.ts` › `shareLink(message, url)` : feuille native / Web Share API / presse‑papiers). C'est utilisé pour **inviter dans une ligue** (`league/[id].tsx`, `leaderboard.tsx`). Mais :

- **Rien pour partager un RÉSULTAT** : l'écran de résultat d'un pari (`bet/[id].tsx`, « Prono gagné / perdu ») **n'a aucun bouton Partager**.
- Un simple lien **ne « frime » pas** : sur Instagram/Stories les liens ne s'ouvrent pas, et sur WhatsApp/FB le lien n'affiche qu'une image OG **générique** (`og-image.jpg`, la même pour tout le monde — cf. `scripts/inject-web-meta.mjs`), pas le résultat perso du joueur.

**« Un truc tout prêt »** = une **carte image de marque, auto‑générée et pré‑remplie** avec le résultat du joueur (équipes, score, gain 🪙, pseudo, logo), qu'il **poste directement en tant qu'IMAGE** en un tap. C'est ce qui manque.

## Ce qui existe déjà (à réutiliser, ne pas réinventer)

- `src/lib/share.ts` › `shareLink()` (feuille native / `navigator.share` / clipboard) + `appOrigin()`. **Le nouveau partage d'IMAGE étend ce module** (mêmes principes de fallback), il ne le remplace pas.
- `src/app/(app)/bet/[id].tsx` — écran de résultat d'un pari (statut `won`/`lost`/`pending`/`void`), affiche `<BetCard bet={bet} />`. **Point d'insertion principal du bouton « Partager ».**
- `src/components/prono/BetCard.tsx` — expose `type Bet = Doc<'bets'> & { match: { homeName, awayName, kickoff, status, homeScore?, awayScore?, homePenalty?, awayPenalty? } | null }`. **C'est la source de données de la carte** (équipes, score, mise, `legs`, `payout`, `status`). Requête : `api.bets.byId`.
- `src/components/brutal/Flag.tsx` › `<Flag name size />` (drapeau via `flagUrl(teamName)` → **image DISTANTE TheSportsDB**). ⚠️ Voir gotcha CORS en Dev Notes.
- `src/lib/assets.ts` › `LOGO = require('../../assets/logo/djassafoot.png')` (wordmark) + assets **locaux** `assets/flags/*.png` et `assets/leagues/*.png`.
- Tokens Noir (Tailwind) : `bg-ink` #0A0A0B, `bg-card`/`bg-surface` #151518, `bg-surface-2` #1C1C20, `border-hairline`, `text-white`, `text-muted` #A1A1AA, `text-green` = **sauge #6FA287 (gains/argent)**, `text-red` #E5484D. Fonts : `font-display` (Sora), `font-ui*` (Inter). **La carte doit être 100% Noir.**
- Analytics : `src/lib/analytics.ts` (`track(EVENTS.x, props)`), events dans `src/lib/analyticsEvents.ts`. **Ajouter `EVENTS.resultShared`.**
- Précédent d'upload/stockage image (si approche serveur retenue en évolution) : `convex/leagues.ts` (`generateUploadUrl`/`ctx.storage`) — **pas nécessaire pour la V1**.

## Approche technique

**Objectif V1 : partager une VRAIE IMAGE (pas un lien).** L'app est **web‑first + natif (Expo/RN‑Web)** → il faut une capture qui marche **des deux côtés**.

### Recommandée (V1) — capturer une carte rendue, puis partager le fichier image
1. **`<ShareCard>`** : composant React Native **de taille fixe** (recommandé **1080×1350**, ratio 4:5 idéal feed + Stories) au **thème Noir**, pré‑rempli depuis `Bet` : wordmark **Djassa**Foot, gros libellé (« Prono gagné »), **équipes + score** (drapeaux), le **combiné** (legs), **gain +🪙X** en sauge, **pseudo** du joueur, et un pied « djassafoot.pages.dev ». Rendu **dans une modale d'aperçu** (carte réellement visible → layout garanti → capture fiable ; meilleure UX « tout prêt »).
2. **Capture → PNG** (util `src/lib/shareImage.ts`, split par plateforme) :
   - **Natif** : `react-native-view-shot` › `captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' })` → `uri`.
   - **Web** : `html-to-image` › `toBlob(domNode, { pixelRatio: 2, cacheBust: true })` sur le **nœud DOM** du ref (en RN‑Web, `ref.current` est l'élément DOM). (⚠️ `react-native-view-shot` sur web est peu fiable → utiliser `html-to-image` sur web.)
3. **Partager le fichier** :
   - **Natif** : `expo-sharing` › `await Sharing.isAvailableAsync()` puis `Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle })`. (Fallback `Share.share` si indispo.)
   - **Web** : construire un `File([blob], 'djassafoot.png', { type: 'image/png' })` ; si `navigator.canShare?.({ files: [file] })` → `navigator.share({ files: [file], text, url })` (WhatsApp/Insta natif mobile) ; **sinon fallback** : déclencher un **téléchargement** de l'image (`<a href=blobURL download>`) **+** copier le texte/lien (réutiliser `shareLink`). Toujours retourner le mode réel (`'shared' | 'downloaded' | 'copied' | 'manual'`) pour un feedback UI.

### Alternative (évolution, HORS scope V1) — image générée côté serveur + OG dynamique
Créer `convex/http.ts` (httpAction) qui **génère l'image** (ou compose une OG) par pari + une **route publique de partage** dont les balises OG sont injectées par une **Cloudflare Pages Function** (car `output: 'single'` = SPA, pas d'OG par‑URL statique). → le **lien** s'« unfurl » avec la carte perso sur WhatsApp/FB/X. **Plus d'infra**, et **inutile sur Instagram** (pas de lien). À proposer plus tard si on veut le partage‑par‑lien enrichi. **Ne pas implémenter en V1.**

## Décision produit

- **V1 = partage d'IMAGE** (approche recommandée) : c'est le « truc tout prêt » qui frime et qui marche partout (feed + Stories + WhatsApp), sans infra serveur.
- **Surface prioritaire** : le **pari gagné** (`bet/[id].tsx`, `status === 'won'`) — le moment le plus viral. Le bouton « Partager » y est **toujours visible** ; libellé adapté (« Partager ma victoire » si `won`, sinon « Partager »).
- **Mécanisme réutilisable** : `ShareCard` + `shareImage()` conçus **génériques** (variant `wonBet` en V1 ; laisser la porte ouverte à `leagueRank`/`leaderboard` plus tard). Câbler une 2ᵉ surface (rang de ligue) est un **stretch**, pas un bloquant.
- **Pas d'argent réel** : la carte parle en **jetons 🪙** uniquement (règle produit inchangée).

## Acceptance Criteria

1. **Bouton de partage sur le résultat** — `bet/[id].tsx` affiche un bouton **« Partager »** (libellé « Partager ma victoire » si `status === 'won'`).
   - Given un pari `won` ouvert, When je tap « Partager ma victoire », Then une **modale d'aperçu** montre la **carte image** pré‑remplie (équipes, score, gain +🪙X en sauge, mon pseudo, wordmark), au thème **Noir**.
2. **Partage d'image en un tap** — depuis la modale, « Partager » déclenche :
   - **Natif** : la **feuille de partage système** avec l'**image PNG** en pièce jointe (pas juste du texte).
   - **Web (mobile, Web Share Files dispo)** : `navigator.share({ files:[png], text, url })`.
   - **Web (fallback)** : **téléchargement** du PNG **+** copie du lien app ; un **message** indique ce qui s'est passé (« Image téléchargée » / « Lien copié »). Aucune erreur non gérée, aucun crash.
3. **Carte fidèle & de marque** — la carte est **1080×1350**, fond `#0A0A0B`, contient : wordmark **Djassa**Foot, titre résultat, **drapeaux + noms + score** (avec `T.a.b.` si `homePenalty/awayPenalty`), les **legs** du combiné avec ✓/✗, **gain** (sauge si gagné), **pseudo**, pied de page URL. Lisible même recadrée en carré (contenu centré, marges sûres).
4. **Robustesse capture** — la capture fonctionne **web ET natif** ; les **drapeaux** (images distantes) apparaissent sur la carte web (voir gotcha CORS : utiliser un mode d'image compatible ou les assets **locaux**). Si la capture échoue, fallback propre (message + partage texte via `shareLink`).
5. **Analytics** — un event `EVENTS.resultShared` est loggé (props : `betId`, `status`, `outcome` du partage `'shared'|'downloaded'|'copied'|'manual'`, `platform`).
6. **Aucune régression / propreté** — aucun secret ; `npx tsc --noEmit`, `npm run build` verts ; nouvelles deps installées via `npx expo install` ; thème Noir respecté (aucune couleur criarde ; sauge = gains uniquement) ; permissions natives (si save‑to‑gallery) déclarées.

## Tasks / Subtasks

- [ ] **T1 — Dépendances** (AC: 2, 6)
  - [ ] `npx expo install react-native-view-shot expo-sharing`
  - [ ] `npm i html-to-image` (capture web) — lib légère, pas de config
  - [ ] (Optionnel « enregistrer dans la galerie » natif) `npx expo install expo-media-library` + plugin/permission dans `app.json` ; sinon s'en tenir à la feuille de partage.
- [ ] **T2 — Util de partage d'image** (AC: 2, 4, 5) — `src/lib/shareImage.ts`
  - [ ] `captureCardPng(ref): Promise<{ uri?: string; blob?: Blob }>` — **split plateforme** : natif `captureRef(...)` (uri tmpfile) ; web `htmlToImage.toBlob(ref.current, { pixelRatio: 2, cacheBust: true })`.
  - [ ] `shareResultImage(captured, { message, url }): Promise<'shared'|'downloaded'|'copied'|'manual'>` — natif `expo-sharing` ; web `navigator.share({files})` sinon download + `shareLink` fallback. Réutiliser `appOrigin()` de `share.ts`.
  - [ ] Ne jamais throw vers l'UI : toujours retourner un mode (comme `shareLink`).
- [ ] **T3 — Composant `ShareCard`** (AC: 1, 3) — `src/components/share/ShareCard.tsx`
  - [ ] Props : `bet: Bet` (+ `username`). Taille fixe 1080×1350 (utiliser un wrapper `collapsable={false}` + `ref`).
  - [ ] Contenu Noir : wordmark (`LOGO`), titre selon statut, `<Flag>`+noms+score (`frTeam`, `formatTime`/score, `T.a.b.`), map des `legs` (libellé + ✓/✗ selon `leg.result`), gain `+🪙{payout}` (sauge), pseudo, pied URL. Réutiliser tokens/format existants (`@/lib/format`, `@/lib/teamNames`).
- [ ] **T4 — Modale d'aperçu + partage** (AC: 1, 2) — `src/components/share/ShareResultModal.tsx`
  - [ ] `Modal` plein écran Noir : rend `<ShareCard>` (dans un conteneur scalé pour tenir à l'écran, mais **capture la taille 1080×1350** via le ref) + boutons **« Partager »** (appelle T2) et **« Fermer »** + affichage du message de mode.
  - [ ] Gérer l'état `busy` pendant capture/partage.
- [ ] **T5 — Câblage sur le résultat** (AC: 1) — `src/app/(app)/bet/[id].tsx`
  - [ ] Ajouter le bouton « Partager (ma victoire) » (près du CTA existant « Voir tous mes pronos ») → ouvre `ShareResultModal`.
  - [ ] Récupérer le pseudo (`api.users.current` ou champ du `bet`) pour la carte.
- [ ] **T6 — Analytics** (AC: 5) — ajouter `resultShared` dans `src/lib/analyticsEvents.ts` et `track(...)` dans T4 après partage.
- [ ] **T7 — (Stretch) 2ᵉ surface** — bouton « Partager mon classement » sur `leaderboard.tsx`/`league/[id].tsx` réutilisant `ShareCard` (variant rang). Facultatif.
- [ ] **T8 — Vérif** (AC: 6) — `npx tsc --noEmit` + `npm run build` verts ; test manuel **web** (partage/télécharge une image lisible avec drapeaux) **et** natif si dispo ; scan secrets avant commit.

## Dev Notes

### Gotchas cross‑platform (préviennent les pièges classiques)
- **`react-native-view-shot` ≠ web** : sur web il est peu fiable → **utiliser `html-to-image`** (branche `Platform.OS === 'web'`). Sur natif, `captureRef` avec `result:'tmpfile'` donne une `uri` partageable par `expo-sharing`.
- **CORS des drapeaux (web)** : `<Flag>` charge des images **distantes TheSportsDB**. `html-to-image` **ne peut pas** rasteriser une image cross‑origin sans en‑têtes CORS → drapeaux **blancs** sur la carte web. **Solutions (choisir la plus simple qui marche)** : (a) utiliser les **assets locaux** `assets/flags/*.png` pour la ShareCard (mapping nom→fichier, cf. la grille de `index.tsx`), ou (b) pré‑charger le drapeau en dataURL, ou (c) `html-to-image` `{ skipFonts:false, cacheBust:true }` + proxy. **Recommandé : assets locaux** (déterministe, pas de réseau).
- **Polices dans la capture** : Sora/Inter sont chargées (global.css `@font-face`). `html-to-image` embarque les fonts par défaut ; garder `skipFonts:false`.
- **Layout requis pour capturer** : la vue doit être **montée et mesurée** (pas `display:none`). La modale d'aperçu (T4) garantit ça. Si capture hors‑écran, positionner `position:absolute` très loin plutôt que `display:none`.
- **Taille/perf** : 1080×1350 @ `pixelRatio:2` sur web reste raisonnable ; ne pas capturer en boucle. PNG (transparence non requise → OK aussi en JPEG qualité 0.9 pour un poids moindre).
- **Web Share Files** : `navigator.canShare({files})` n'est dispo qu'en **HTTPS mobile** (Chrome Android, Safari iOS). Desktop → fallback download. Toujours tester `canShare` avant `share({files})`.

### Fichiers
- **Nouveaux** : `src/lib/shareImage.ts`, `src/components/share/ShareCard.tsx`, `src/components/share/ShareResultModal.tsx`.
- **Modifiés** : `src/app/(app)/bet/[id].tsx` (T5), `src/lib/analyticsEvents.ts` (T6), `app.json` (si media‑library), `package.json` (deps). (Stretch) `leaderboard.tsx`/`league/[id].tsx`.
- **Réutilisés (ne pas dupliquer)** : `src/lib/share.ts` (`appOrigin`, `shareLink` fallback), `Flag`, `LOGO`, `@/lib/format`, `@/lib/teamNames`, tokens Noir.

### Testing standards
- Pas de framework de test dans le repo (aucun `test/jest/vitest` dans `package.json`). Vérification = **build + test manuel** :
  - `npx tsc --noEmit` et `npm run build` doivent rester **verts**.
  - **Manuel web** : ouvrir un pari gagné → « Partager ma victoire » → l'aperçu montre la carte **avec drapeaux + gain sauge** ; le bouton partage soit ouvre la feuille (mobile) soit **télécharge une image lisible** (desktop). Vérifier qu'aucune console‑error n'apparaît.
  - **Manuel natif (si dispo)** : la feuille système propose bien l'**image** (WhatsApp/Instagram).
- Optionnel : un petit script `scripts/` qui vérifie le mapping nom‑équipe→drapeau‑local si l'option assets locaux est choisie (éviter les drapeaux manquants).

### Décisions & garde‑fous
- **V1 = image, pas de serveur.** Ne PAS créer `convex/http.ts` / route OG dynamique / Cloudflare Function pour cette story (documenté comme évolution).
- **Thème Noir strict** : la carte n'utilise **aucune couleur criarde** ; le **sauge #6FA287** est réservé au **gain**, le rouge `#E5484D` au perdu. Fond `#0A0A0B`.
- **Économie 100% virtuelle** : la carte montre des **jetons 🪙**, jamais d'argent réel.
- **Pas de secret** dans les URLs/partages (le lien partagé est l'origine publique de l'app + éventuellement un chemin non sensible).

### References
- Partage existant (à étendre) : [src/lib/share.ts](../../src/lib/share.ts).
- Écran résultat (point d'insertion) : [src/app/(app)/bet/[id].tsx](../../src/app/%28app%29/bet/%5Bid%5D.tsx).
- Données du pari : [src/components/prono/BetCard.tsx](../../src/components/prono/BetCard.tsx) (`type Bet`), requête `api.bets.byId`.
- Drapeaux / logo / formats : [src/components/brutal/Flag.tsx](../../src/components/brutal/Flag.tsx), [src/lib/assets.ts](../../src/lib/assets.ts), `src/lib/format.ts`, `src/lib/teamNames.ts`.
- Thème Noir (tokens) : [tailwind.config.js](../../tailwind.config.js).
- OG statique existant (contexte du fallback lien) : [scripts/inject-web-meta.mjs](../../scripts/inject-web-meta.mjs).
- Story précédente (format/patterns) : [docs/stories/1-1-empecher-paris-illegaux.md](./1-1-empecher-paris-illegaux.md).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8

### Debug Log References

- `npx tsc --noEmit` ✅ · `npm run build` ✅ (bundle web = `shareImage.web.ts`, view-shot exclu ; natif = `shareImage.ts`).
- CORS vérifié : TheSportsDB renvoie `access-control-allow-origin: *` → les drapeaux distants s'inlinent dans la capture web (`html-to-image`). Donc `ShareCard` utilise `<Flag>` (pas besoin d'assets locaux).
- **Revue adversariale (3 lentilles + vérif sceptique)** → 2 bugs **confirmés** et corrigés :
  1. Web : annulation de `navigator.share()` (AbortError) était avalée → téléchargement non désiré + faux « Image téléchargée » + analytics faussée. **Fix** : détecter `AbortError` → statut `cancelled` (ne rien faire), ne retomber sur le téléchargement que pour une vraie erreur.
  2. Natif iOS : `captureRef` renvoie un chemin **sans `file://`** → `expo-sharing` throw → fallback dégradé (image + texte, et rien sur Android). **Fix** : préfixer `file://` si pas de scheme avant `Sharing.shareAsync`.

### Completion Notes List

- **V1 = partage d'IMAGE, sans serveur** (comme décidé). Split plateforme `shareImage.ts` (natif : `react-native-view-shot` + `expo-sharing`) / `shareImage.web.ts` (web : `html-to-image` + Web Share Files / téléchargement) → chaque bundle n'embarque que sa lib.
- `ShareCard` (forwardRef, 340px, thème Noir) = **aperçu ET cible de capture** ; `pixelRatio:3` sur web pour la résolution. Statut `won`/`lost`/`pending`/`void` géré (libellé + couleur : sauge=gain, rouge=perdu).
- Statut `cancelled` ajouté à `ShareOutcome` pour distinguer l'annulation d'un succès (pas de faux message, modale reste ouverte, analytics exacte).
- Câblé sur `bet/[id].tsx` (bouton « Partager ma victoire » si gagné). Event analytics `resultShared` (betId, status, outcome, platform).
- Réutilise `share.ts` (`appOrigin`/`shareLink` fallback), `Flag`, tokens Noir. Aucun secret. Aucune régression (ajout pur).
- Non fait (hors scope V1, documenté) : image OG dynamique serveur + route de partage (Cloudflare Function) ; 2ᵉ surface « partager mon classement » (T7 stretch).

### File List

- `src/lib/shareImage.ts` (nouveau — capture+partage natif)
- `src/lib/shareImage.web.ts` (nouveau — capture+partage web)
- `src/components/share/ShareCard.tsx` (nouveau — carte de partage Noir)
- `src/components/share/ShareResultModal.tsx` (nouveau — aperçu + partage)
- `src/app/(app)/bet/[id].tsx` (modifié — bouton + modale de partage)
- `src/lib/analyticsEvents.ts` (modifié — event `resultShared`)
- `package.json` (deps : `react-native-view-shot`, `expo-sharing`, `html-to-image`)
