# spec.md — Djassa Foot · Architecture & modèle de données

> Document vivant. Source de vérité pour l'archi, le data model, le scope. Mis à jour à chaque décision.
> Stack & règles : voir `AGENTS.md`. Plan d'exécution : voir `plan.md`.

---

## 1. Vue d'ensemble

```
┌────────────────────────────────────────────────────────────┐
│  CLIENT  — Expo (web-first, puis iOS/Android)              │
│  app/ (Expo Router) · components/ · store/ (Zustand UI)    │
│  NativeWind (styling) · Clerk (auth UI)                    │
└───────────────┬───────────────────────────┬────────────────┘
                │ useQuery / useMutation     │ useAuth (Clerk)
                ▼ (réactif, websocket)       ▼
┌────────────────────────────────────────────────────────────┐
│  CONVEX  — backend réactif                                 │
│  schema.ts · query/mutation (DB) · action (fetch externe)  │
│  crons.ts (ingestion + settlement) · auth.config.ts        │
└───────────────┬────────────────────────────────────────────┘
                │ action.fetch() (secrets côté serveur)
                ▼
┌────────────────────────────────────────────────────────────┐
│  APIs FOOT EXTERNES                                         │
│  TheSportsDB Premium v2 (X-API-KEY) · API-Football (secours)│
└────────────────────────────────────────────────────────────┘

PostHog : posthog-js (web) / posthog-react-native (natif)  ── analytics
```

**Principe clé** : le client ne parle **jamais** directement aux API foot. Convex (`action` + cron) récupère les données avec les **clés secrètes côté serveur**, les stocke, et le client lit via des **queries réactives**. Les scores live se propagent tout seuls (réactivité Convex).

---

## 2. Structure des dossiers

```
djassafoot/                                # racine de l'app Expo (SDK 56 → code client sous src/)
├── AGENTS.md · spec.md · plan.md · CLAUDE.md   # pile Practical Vibe Coding (CLAUDE.md = @AGENTS.md)
├── src/
│   ├── app/                              # Expo Router (web-first)
│   │   ├── _layout.tsx                   # import global.css, fonts, providers: PostHog > Clerk > ConvexProviderWithClerk > Stack
│   │   ├── index.tsx                     # splash / redirection
│   │   ├── onboarding.tsx
│   │   ├── (auth)/                       # sign-in, sign-up (Clerk custom UI) + _layout (redirige si connecté)
│   │   ├── (tabs)/                       # app protégée + _layout (bottom tabs, garde useAuth())
│   │   │   └── index · matches · pronos · leaderboard · profile
│   │   ├── match/[id].tsx                # Détail match + terrain/compos
│   │   ├── prono/[matchId].tsx           # Flow de prono (mise + buteur)
│   │   └── team/[id].tsx · search.tsx · notifications.tsx
│   ├── components/                       # UI réutilisable (universel : <View>/<Text>)
│   │   └── MatchCard · PronoCard · FlameBalance · TeamCrest · NeutralAvatar · TabBar
│   ├── store/                            # Zustand (état UI client uniquement)
│   │   ├── prefsStore.ts                 # thème, langue, onboarding (persist) ✓ Phase 0
│   │   └── pronoDraftStore.ts            # brouillon de prono (Phase 4)
│   ├── constants/theme.ts                # tokens (template) — DA dans tailwind.config.js (cf. §7)
│   ├── lib/analytics.ts                  # wrapper PostHog (split web/native)
│   ├── data/ · types/ · hooks/           # seed statique · types · hooks
│   └── global.css                        # @tailwind base/components/utilities + vars fonts
├── convex/                               # backend (Phase 1) — à la RACINE, PAS dans src/
│   ├── schema.ts                         # tables + index (cf. §3)
│   ├── auth.config.ts                    # Clerk issuer + applicationID 'convex'
│   ├── users · matches · predictions · flames · leaderboard · friends
│   ├── football.ts                       # internalAction: ingestion API (fetch)
│   ├── settlement.ts                     # internalMutation: valider les pronos
│   └── crons.ts                          # planification ingestion + settlement
├── assets/                               # logo, drapeaux, images (copiés du design)
├── tailwind.config.js · babel.config.js · metro.config.js · nativewind-env.d.ts
├── app.json (web.bundler "metro", output "static") · tsconfig.json (alias @/ → src/)
```

---

## 3. Modèle de données Convex (`convex/schema.ts`)

> Validators `v.*`. Toujours indexer les champs de lookup/tri. Brouillon — affiner en Phase 2.

| Table | Champs (principaux) | Index |
|---|---|---|
| **users** | `tokenIdentifier` (Clerk subject), `username`, `avatarUrl?`, `flames` (number), `points` (number, score classement), `streak` (number), `lastDailyBonusAt?` (ts), `createdAt` | `by_token [tokenIdentifier]`, `by_points [points]` |
| **competitions** | `apiId`, `name`, `logoUrl`, `season`, `status` (`active`\|`locked`), `startDate`, `endDate` | `by_api [apiId]` |
| **teams** | `apiId`, `name`, `flagUrl`, `competitionApiId?` | `by_api [apiId]` |
| **players** | `apiId`, `name`, `teamApiId`, `photoUrl?` | `by_api [apiId]`, `by_team [teamApiId]` |
| **matches** | `apiId`, `competitionApiId`, `homeName`, `awayName`, `homeFlagUrl`, `awayFlagUrl`, `kickoff` (ts), `status` (`scheduled`\|`live`\|`finished`), `homeScore?`, `awayScore?`, `minute?`, `round` | `by_api [apiId]`, `by_kickoff [kickoff]`, `by_competition [competitionApiId]`, `by_status [status]` |
| **predictions** | `userId` (id users), `matchId` (id matches), `type` (`result_1x2`\|`exact_score`\|`scorer`), `pick1x2?` (`home`\|`draw`\|`away`), `homeGoals?`, `awayGoals?`, `scorerPlayerId?`, `stake` (flames), `odds?`, `potentialPayout`, `status` (`pending`\|`won`\|`lost`\|`void`), `payout?`, `createdAt`, `settledAt?` | `by_user [userId]`, `by_match [matchId]`, `by_user_status [userId,status]` |
| **flameTransactions** | `userId`, `amount` (+/-), `reason` (`signup_bonus`\|`daily_bonus`\|`ad_reward`\|`referral`\|`prediction_stake`\|`prediction_win`), `refId?`, `createdAt` | `by_user [userId]` |
| **friends** | `userId`, `friendId`, `status` (`pending`\|`accepted`), `createdAt` | `by_user [userId]`, `by_friend [friendId]` |
| **notifications** | `userId`, `kind`, `title`, `body`, `matchId?`, `read` (bool), `createdAt` | `by_user [userId]` |

**Lien Clerk → users** : à la première query authentifiée, lire `ctx.auth.getUserIdentity()`, chercher `users` via `by_token`, créer la ligne si absente (+ `signup_bonus`).

---

## 4. Économie des jetons 🪙 (100 % virtuel)

> **Principe** : les jetons doivent rester RARES — les gains viennent surtout des **pronos gagnés** (skill), pas de robinets gratuits. Pas d'inflation.

| Source / dépense | Montant | Règle |
|---|---|---|
| **Bonus d'inscription** | +500 | une seule fois, à la création du user |
| **Bonus quotidien** | **+20 fixe** (pas de multiplicateur) | 1×/24 h, via `claimDailyBonus` ; la série est affichée mais ne gonfle plus le gain |
| **Parrainage** | **+10** (parrain) | petit, non inflationniste (système de parrainage à construire) |
| **Pub récompensée** | **retiré (hors scope)** | pas de gain par pub — biaiserait le jeu |
| **Mise sur un prono** | −`stake` | débit à la pose du prono |
| **Gain de prono** | +`stake × cote totale` | crédit à la résolution si combiné gagnant |

**Interdits absolus** : achat de jetons, conversion en argent, retrait. Chaque mouvement = une ligne dans `flameTransactions` (nom interne conservé ; `users.flames` = solde dérivé/maintenu). UI : « jetons » + 🪙.

**Résolution (settlement)** : quand un match passe `finished`, `settlement.ts` (internalMutation) parcourt les `predictions` `pending` de ce match, calcule `won`/`lost`, crédite les gains, met à jour `users.points`.

---

## 5. Ingestion des données foot

- **`convex/football.ts`** : `internalAction` qui `fetch()` TheSportsDB Premium v2 (header `X-API-KEY`) — fixtures, scores, compos, buteurs. API-Football en secours (xG, compos détaillées).
- Secrets en **variables d'env Convex** : `THESPORTSDB_KEY`, `FOOTBALL_API_KEY` (`npx convex env set ...`). **Jamais** en `EXPO_PUBLIC_*`.
- **`convex/crons.ts`** :
  - `crons.interval('live scores', { minutes: 2 }, internal.football.ingestLive)` — matchs live.
  - `crons.cron('daily fixtures', '0 6 * * *', internal.football.syncFixtures)` — calendrier quotidien.
  - Après mise à jour d'un match `finished` → déclencher `settlement`.
- Pattern : `action` (fetch) → `ctx.runMutation(internal.football.upsertMatches, …)`. Les queries/mutations ne peuvent **pas** `fetch()`.

---

## 6. Auth (Clerk ↔ Convex) & multi-plateforme

- **Clerk** : email + Google + Apple. `<ClerkProvider tokenCache={...}>` externe, `<ConvexProviderWithClerk client={convex} useAuth={useAuth}>` interne (`convex/react-clerk`).
- **`convex/auth.config.ts`** : `{ providers: [{ domain: process.env.CLERK_JWT_ISSUER_DOMAIN, applicationID: 'convex' }] }`. Template JWT Clerk nommé **exactement** `convex`. `CLERK_JWT_ISSUER_DOMAIN` = variable d'env **Convex**.
- **Env client** : `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_CONVEX_URL`.
- **Web-first** :
  - Convex `convex/react` : **identique** web & natif → réactivité OK partout.
  - `expo-secure-store` = natif (sur web Clerk gère le stockage de session via clerk-js).
  - **PostHog** : `posthog-js` sur web, `posthog-react-native` sur natif → wrapper unique dans `lib/analytics.ts` (split `Platform.OS`).
  - OAuth Google/Apple : tester séparément web (clerk-js) vs natif (`useSSO` + `expo-web-browser`).
  - Composants **universels** (`<View>`/`<Text>`), jamais de DOM web.

---

## 7. Design tokens (`constants/theme.ts` + `tailwind.config.js`)

> Tokens OFFICIELS extraits de `djassa.pen` (variables) — noms identiques en code (`tailwind.config.js`). ✅ vérifié 2026-06-26.

```
colors (= classes NativeWind):
  blue-bottom   #0A1230   bg-blue-bottom   (fond, bas du dégradé)
  blue-mid      #16215C   bg-blue-mid      (milieu du dégradé)
  blue-top      #2C40A0   bg-blue-top      (haut du dégradé)
  ink           #0A1230   text-ink         (texte sur fond clair)
  surface       #1B2658   bg-surface       (cartes)
  surface-2     #232F66   bg-surface-2     (cartes secondaires / badges)
  red           #E5342B   text-red         (accent / CTA / "Foot" du logo)
  muted         #9AA4CC   text-muted       (texte secondaire)
  white         #FFFFFF   text-white
fonts (= classes NativeWind) — display = Sora (upgrade du Montserrat d'origine), texte = Inter :
  font-display          Sora 800     (titres, scores, chiffres)
  font-display-bold     Sora 700
  font-display-semibold Sora 600
  font-ui               Inter 400    (texte courant)
  font-ui-medium        Inter 500
  font-ui-semibold      Inter 600
  font-ui-bold          Inter 700    (boutons, ex. "Se déconnecter")
radius: cartes 16–20px · pills full
```
> **Fond dégradé OFFICIEL** (linéaire vertical, rotation 180° = clair en haut, foncé en bas) — via `<ScreenBackground>` (`expo-linear-gradient`) ✅ :
> - **`app`** (Home, Match Detail, contenu) : `#16215C → #0A1230` (mid → bottom)
> - **`hero`** (Splash, Welcome, Auth) : `#2C40A0 → #16215C` (55 %) `→ #0A1230` (top → mid → bottom)
>
> La flamme 🔥 est l'emoji (pas de couleur tokenisée). Fond rouge translucide des boutons destructifs : `red` à ~13 % d'opacité (`#E5342B22`).

**Règles DA** : logo = image `assets/logo/djassafoot.png` (aligné à gauche en header). Pas de sidebar. Drapeaux full-size. Avatar neutre (type Clerk) si pas de photo joueur. Logos **officiels** des compétitions (jamais d'icône de coupe générée).

---

## 8. Scope & Non-Goals

### Dans le scope (MVP web)
- Auth (Clerk) · Onboarding · Accueil (matchs vedette + live) · Liste matchs · Détail match (compos) · Flow prono (1X2 / score / buteur, mise en flammes) · Mes pronos · Résolution auto · Classement réactif · Profil · Bonus quotidien · Amis · Notifications in-app · Analytics (PostHog).
- Données réelles **CdM 2026** via ingestion Convex.

### Hors scope MVP (plus tard)
- Pubs récompensées AdMob & push natif (**Phase 9**, build natif).
- Autres compétitions que la CdM (les afficher en « verrouillé » avec le flow d'indispo).
- Tout argent réel / achat / retrait (**jamais** — par design).
- Prof IA vocal / Stream / Vision Agent (présent dans le tuto JS Mastery, **non pertinent** ici).
