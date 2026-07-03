# Story 1.4 : Pubs récompensées (regarder une pub → +20 jetons, max 3/jour, SSV)

Status: ready-for-review — implémenté + revue adversariale + correctifs (2026-07-03)

<!-- Créée hors scaffolding BMAD (projet sans epics/sprint-status). Auto-suffisante pour dev-story. -->
<!-- Specs AdMob (SSV) et config lib vérifiées sur les docs officiels (voir References). -->

## Story

As a **joueur de Djassa Foot**,
I want pouvoir **regarder une publicité vidéo pour gagner des jetons** (jusqu'à 3 pubs/jour, +20 🪙 chacune),
so that je puisse **renflouer mon solde gratuitement** entre deux bonus quotidiens, **sans jamais payer d'argent réel**.

## Contexte & problème

- **Réintroduction assumée** : la « pub récompensée » avait été retirée plus tôt (« biaiserait le jeu », économie rééquilibrée pour des **jetons rares**). Le PO la ré-introduit **plafonnée** : `+20 🪙 × max 3/jour` = **60 🪙/jour max** via pub (à comparer au bonus quotidien de 20). Le plafond serveur est donc la pièce maîtresse anti-inflation.
- **La brique existe à moitié** : le motif `ad_reward` est **déjà** dans `flameTransactions.reason` (`convex/schema.ts`).
- **Régie** : **Google AdMob** via **`react-native-google-mobile-ads`** (Invertase — l'ancienne `expo-ads-admob` est supprimée). **Non installée** aujourd'hui.
- **IDs AdMob fournis (PUBLICS — OK dans le code/`app.json`, ce ne sont PAS des secrets)** :
  - App ID (Android) : `ca-app-pub-8445698013703110~5995369183`
  - Ad unit récompensée : `ca-app-pub-8445698013703110/6639356691`
- **Natif uniquement** : AdMob ne fait pas de pub récompensée sur **web** (l'app est web-first). La lib n'a pas de support web → import à isoler (split Metro `.web.ts`/`.native.ts`, comme `src/lib/analytics`). Bouton masqué sur web.
- **Anti-triche = SSV robuste (choisi par le PO)** : le crédit n'est **JAMAIS** fait côté client. AdMob appelle un **endpoint serveur** (Server-Side Verification) qu'on héberge dans **Convex HTTP** ; on **vérifie la signature** puis on crédite. Le client ne fait qu'afficher la pub et rafraîchir son solde (réactif).

## Décisions PO (figées 2026-07-03)
- **Montant** : +20 🪙 par pub. **Plafond** : **3 pubs/jour** (fenêtre glissante 24 h ou jour calendaire — voir Q1).
- **Anti-fraude** : **SSV** (Server-Side Verification) — voie robuste.
- **Plateforme** : **Android d'abord** (IDs fournis = Android). iOS = plus tard (créer une app AdMob iOS + ses IDs + ATT).

## Architecture — flux SSV (le cœur de la story)

```
[App native]                         [Google AdMob]                 [Convex]
 1. mobileAds().initialize()
 2. consent UMP + (ATT iOS)
 3. RewardedAd.createForAdRequest(unitId, {
      serverSideVerificationOptions: { userId: <convexUserId> }
    })
 4. .load() → .show()
 5. user regarde la pub ───────────────►
                                   6. AdMob GET callback SSV ──────► /admob-ssv?...&signature=..&key_id=..
                                                                     7. vérifie signature (clés Google)
                                                                     8. dédup transaction_id + cap 3/j
                                                                     9. crédite +20 🪙 (ad_reward)
 10. me.flames (query réactive) ◄──────────────────────────────────  se met à jour tout seul
```
Le crédit vient de l'étape 9 (serveur), **pas** de l'événement `EARNED_REWARD` du client (qui ne sert qu'à l'UX « récompense en cours… »).

## Acceptance Criteria

1. **Bouton natif** — Sur l'écran Profil (près du bonus quotidien), un bouton **« Regarder une pub (+20 🪙) »** apparaît **sur natif uniquement** (jamais sur web). Il indique l'état : disponible / « Reviens plus tard » (quota atteint) / chargement.
2. **Quota** — Au plus **3 crédits pub par jour** et par utilisateur. Le 4ᵉ est refusé côté serveur (le bouton est aussi désactivé côté client via une query de quota).
3. **Crédit serveur (SSV)** — Le crédit de +20 🪙 se fait **uniquement** via le callback SSV vérifié. Un callback à signature invalide ou rejouée **ne crédite pas**.
   - Given un callback SSV **valide** avec `user_id` = un joueur, When reçu, Then +20 🪙 crédités, une ligne `flameTransactions(reason:'ad_reward')` créée, et le solde du joueur augmente (réactif).
   - Given le **même `transaction_id`** rejoué, When reçu, Then **aucun** crédit supplémentaire (idempotent).
   - Given une **signature invalide**, When reçu, Then **aucun** crédit (réponse HTTP non-200 ou 200 sans crédit selon la politique, mais jamais de crédit).
   - Given le joueur a **déjà 3** crédits aujourd'hui, When un 4ᵉ callback arrive, Then **aucun** crédit.
4. **Consentement** — Avant tout chargement de pub, le flux **UMP (consentement RGPD)** est exécuté ; sur iOS, l'**ATT** est demandé (quand iOS sera activé).
5. **Zéro régression / build** — App web build OK (bouton masqué, aucun import natif qui casse le bundle web) ; `tsc`, `convex` déployé, build natif OK. **Aucune vente de jetons** (100 % virtuel, la pub ne fait qu'en octroyer).

## Tasks / Subtasks

- [ ] **T1 — Dépendance + config native** (AC: 1,5)
  - [ ] `npx expo install react-native-google-mobile-ads`.
  - [ ] `app.json` → ajouter le plugin (config Expo) :
    ```json
    ["react-native-google-mobile-ads", { "androidAppId": "ca-app-pub-8445698013703110~5995369183" }]
    ```
    (⚠️ `iosAppId` à ajouter quand l'app AdMob iOS existera.)
  - [ ] `npx expo prebuild -p android` (le plugin écrit l'App ID + la permission `AD_ID` dans le manifest) puis rebuild natif (Android Studio / EAS). **Pas testable en Expo Go.**
- [ ] **T2 — Wrapper natif isolé** (AC: 1,5) — split Metro comme `src/lib/analytics`
  - [ ] `src/lib/ads.ts` (**web = no-op** : `isAdsSupported=false`, `showRewarded=async()=>false`, `initAds=()=>{}`).
  - [ ] `src/lib/ads.native.ts` (réel) : `initAds()` (`mobileAds().initialize()`), `requestConsent()` (UMP `AdsConsent`), `showRewarded(userId): Promise<boolean>` qui crée `RewardedAd.createForAdRequest(UNIT_ID, { serverSideVerificationOptions: { userId } })`, `.load()`, `.show()`, résout sur `AdEventType.CLOSED` / `EARNED_REWARD`.
  - [ ] Constantes : `UNIT_ID = __DEV__ ? TestIds.REWARDED : 'ca-app-pub-8445698013703110/6639356691'` (⚠️ **toujours les IDs de test en dev** — cliquer ses vraies pubs = ban AdMob).
  - [ ] `initAds()` + `requestConsent()` au démarrage natif (dans `src/app/_layout.tsx`, gardé `Platform.OS !== 'web'`).
- [ ] **T3 — Schéma : idempotence + quota** (AC: 2,3) — `convex/schema.ts`
  - [ ] Table `adRewards`: `userId: v.id('users')`, `transactionId: v.string()`, `amount: v.number()`, `createdAt: v.number()`. Index `.index('by_transaction', ['transactionId'])` + `.index('by_user', ['userId'])`.
  - [ ] `flameTransactions.reason` a **déjà** `ad_reward` — rien à ajouter.
- [ ] **T4 — Endpoint SSV (Convex HTTP)** (AC: 3) — **nouveau** `convex/http.ts`
  - [ ] `httpRouter()` avec route `GET /admob-ssv` → `httpAction`.
  - [ ] Le handler lit la query brute, sépare le contenu signé (tout **avant** `&signature=`) de `signature`/`key_id`, puis délègue la **vérification** à une **action Node** (`"use node"`, ex. `convex/adsNode.ts`) car Node `crypto.verify` gère nativement **ECDSA/SHA-256 + signature DER + clé PEM** (le runtime V8 par défaut ne fait que du P1363 → conversion pénible).
  - [ ] `convex/adsNode.ts` `internalAction verifyAndCredit({ signedContent, signatureB64url, keyId, params })` :
    - [ ] fetch + **cache** des clés `https://gstatic.com/admob/reward/verifier-keys.json` ; sélection par `key_id` ; `crypto.createVerify('sha256').update(signedContent).verify(pem, derSignature)`.
    - [ ] si invalide → return `{ok:false}` (pas de crédit).
    - [ ] si valide → `runMutation(internal.ads.creditReward, { userId: params.user_id, transactionId: params.transaction_id, amount: 20 })`.
  - [ ] Réponse HTTP **200** à AdMob dès que traité (même si quota/rejeu → 200 sans crédit, pour ne pas faire retenter en boucle).
- [ ] **T5 — Crédit + quota (mutation interne)** (AC: 2,3) — `convex/ads.ts`
  - [ ] `internalMutation creditReward({ userId, transactionId, amount })` :
    - [ ] **idempotence** : si `adRewards` a déjà ce `transactionId` (index `by_transaction`) → return sans rien faire.
    - [ ] **quota** : compter les `adRewards` de `userId` dans la fenêtre du jour (index `by_user` + filtre `createdAt`) ; si ≥ 3 → return sans créditer.
    - [ ] sinon : `patch(user.flames += amount)` + insert `flameTransactions(reason:'ad_reward', refId: transactionId)` + insert `adRewards`.
  - [ ] `query adRewardsRemaining` (public) : renvoie `3 - <nb aujourd'hui>` pour l'UI (bouton grisé si 0).
- [ ] **T6 — UI Profil** (AC: 1,2) — `src/app/(app)/(tabs)/profile.tsx`
  - [ ] Sous la carte « Bonus quotidien », une carte **« Gagner des jetons »** (natif seulement, `!isAdsSupported → null`) : bouton « Regarder une pub (+20 🪙) », état `adRewardsRemaining` (« Encore N aujourd'hui » / « Reviens demain »).
  - [ ] `onPress` : récupère `me._id` (via `api.users.current`), appelle `showRewarded(me._id)` ; pendant la pub → « Chargement… » ; après fermeture → message « Récompense en cours… » (le solde se met à jour via la query réactive quand le SSV crédite). Gérer l'échec (pub non dispo) proprement.
  - [ ] Event analytics `ad_reward_watched` (ajouter à `src/lib/analyticsEvents.ts`).
- [ ] **T7 — Console AdMob (manuel, PO)** (AC: 3)
  - [ ] Dans AdMob → l'unité récompensée → **Server-side verification** → **Callback URL** = `${EXPO_PUBLIC_CONVEX_SITE_URL}/admob-ssv` (domaine `…-convex-http…`).
  - [ ] Régler le **content rating** de l'app (simulated gambling → filtrer le contenu des pubs), audience **17+**.
- [ ] **T8 — Déploiement + vérif** (AC: 5)
  - [ ] ⚠️ **`npx convex dev --once`** (déploie schéma + `http.ts` + actions/mutations — `codegen` NE déploie PAS, cf. incident du 2026-07-03).
  - [ ] `npx tsc --noEmit` + `npm run build` (web) verts, bouton absent sur web.
  - [ ] Test natif avec `TestIds.REWARDED` : regarder une pub test → +20 🪙 arrivent via SSV ; 4ᵉ refusée ; rejeu du même `transaction_id` sans effet.

## Dev Notes

### SSV — paramètres exacts (source : doc AdMob SSV)
- Query params (ordre alpha) : `ad_network`, `ad_unit`, `custom_data` (si défini), `key_id`, `reward_amount`, `reward_item`, `signature`, `timestamp`, `transaction_id`, `user_id` (si défini).
- **Les 2 derniers params sont toujours `signature` puis `key_id`.** Le **contenu signé = toute la query string AVANT `&signature=`** (telle que reçue, non ré-encodée).
- Clés publiques : `https://gstatic.com/admob/reward/verifier-keys.json` (map `keyId → {pem, base64}`). **ECDSA + SHA-256, signature encodée DER** (base64url dans l'URL → décoder avant `verify`).
- `user_id` / `custom_data` sont posés côté client via `serverSideVerificationOptions` → **mettre `userId = me._id` (l'id Convex)** pour savoir qui créditer.

### Pourquoi une action Node
`crypto.verify`/`createVerify` de **Node** gèrent nativement DER + PEM + ECDSA. Le runtime Convex par défaut (Web Crypto) attend une signature **P1363 (r||s)**, pas DER → il faudrait convertir la signature à la main. On isole donc la vérif dans `convex/adsNode.ts` avec `"use node";`. L'`httpAction` (runtime par défaut) route → `runAction` (Node) → `runMutation` (crédit).

### Crédit — modèle existant à copier
`convex/flames.ts › claimDailyBonus` (l.31-89) : patch `user.flames`, insert `flameTransactions` (ici `reason:'ad_reward'`, `refId = transactionId`). `DAILY_BONUS = 20` (l.4) = même montant. Le quota s'inspire du garde `lastDailyBonusAt` mais ici c'est **un compteur/jour** (table `adRewards`).

### Isolation web (obligatoire)
Reproduire le split de `src/lib/analytics.ts` (natif no-op) / `src/lib/analytics.web.ts`. Ici : `src/lib/ads.ts` = **web/no-op par défaut**, `src/lib/ads.native.ts` = implémentation. Ainsi le **bundle web ne référence jamais** `react-native-google-mobile-ads`. Le bouton : `import { isAdsSupported } from '@/lib/ads'` → `if (!isAdsSupported) return null`.

### Consentement & conformité
- **UMP** (`AdsConsent.requestInfoUpdate()` + `loadAndShowConsentFormIfRequired()`) **avant** `initialize()`/load (RGPD, utilisateurs UE).
- **iOS (plus tard)** : App Tracking Transparency (`requestTrackingAuthorization`) + créer l'app AdMob iOS + `iosAppId`.
- **Impact confidentialité** : AdMob collecte l'**identifiant publicitaire** + fait du **tracking** → mettre à jour **Data Safety (Google)** et **App Privacy (Apple)** en conséquence (cocher pub/tracking = oui). Le plugin ajoute la permission `com.google.android.gms.permission.AD_ID`.

### Économie (garde-fou)
Plafond dur **3/jour** appliqué **côté serveur** (T5). Max +60 🪙/jour via pub. Ne PAS créditer côté client (sinon triche + inflation non bornée). Si l'inflation observée est trop forte, le PO peut baisser le plafond ou le montant sans changer le code (constantes).

### Project Structure Notes
- Nouveaux : `convex/http.ts` (router SSV), `convex/adsNode.ts` (`"use node"` vérif), `convex/ads.ts` (mutation crédit + query quota), table `adRewards` (`schema.ts`), `src/lib/ads.ts` + `src/lib/ads.native.ts`.
- Modifiés : `app.json` (plugin), `src/app/_layout.tsx` (init natif), `src/app/(app)/(tabs)/profile.tsx` (carte pub), `src/lib/analyticsEvents.ts` (event).
- Sécurité : les 2 IDs AdMob sont **publics** (embarqués dans l'app) → OK en clair. **Aucun secret** ajouté (le SSV se vérifie avec des **clés publiques** Google, pas un secret partagé). Garder le contrôle « zéro secret » avant commit.

### References
- Docs fournies par le PO : [AdMob rewarded (Android)](https://developers.google.com/admob/android/rewarded?hl=fr) · [quick-start / import SDK](https://developers.google.com/admob/android/quick-start?hl=fr#import_the_mobile_ads_sdk).
- SSV (params + vérif signature) : https://developers.google.com/admob/android/ssv · clés : https://gstatic.com/admob/reward/verifier-keys.json
- Lib RN : `react-native-google-mobile-ads` (Invertase) — plugin Expo `androidAppId`/`iosAppId` ; `RewardedAd.createForAdRequest`, `serverSideVerificationOptions`, `TestIds.REWARDED`, `AdsConsent`.
- Crédit modèle : [convex/flames.ts](../../convex/flames.ts) (`claimDailyBonus` 31-89, `DAILY_BONUS` 4).
- Split natif/web : [src/lib/analytics.ts](../../src/lib/analytics.ts) + [analytics.web.ts](../../src/lib/analytics.web.ts).
- Schéma : [convex/schema.ts](../../convex/schema.ts) (`flameTransactions.reason` a `ad_reward` ; `users` l.6-21).
- Profil (emplacement bouton) : [src/app/(app)/(tabs)/profile.tsx](../../src/app/(app)/(tabs)/profile.tsx) (carte Bonus quotidien).

## Questions ouvertes (à trancher pendant l'implémentation)
- **Q1 — Fenêtre du quota** : « 3/jour » = jour **calendaire** (reset minuit, fuseau ?) ou **fenêtre glissante 24 h** ? (Reco : calendaire UTC, simple et lisible ; ou heure locale du device côté affichage.)
- **Q2 — Emplacement** : carte sur **Profil** (près du bonus quotidien, reco) uniquement, ou **aussi** un accès depuis l'accueil ?
- **Q3 — Politique en cas d'échec SSV** (signature invalide) : répondre **HTTP 200 sans créditer** (reco, évite les retentatives AdMob) ou non-200 ?

## Dev Agent Record

### Agent Model Used

claude-opus-4-8

### Debug Log References

- `npx convex dev --once` ✅ (schéma `adRewards` + endpoint SSV `http.ts` + action Node + mutation déployés — `codegen` seul NE déploie pas).
- `npx tsc --noEmit` ✅ (via `convex/node-runtime.d.ts` : `/// <reference types="node" />` pour que le tsc de l'app connaisse `node:crypto`/`Buffer` de l'action Node).
- `npm run build` (web) ✅ · endpoint `https://djassafoot-convex-http.locagri-app.com/admob-ssv` → HTTP 200 · `ads:adRewardsRemaining` → 0 (sans auth).
- `verify-moderation`-style : **revue adversariale** (3 dimensions × vérif) = 6 constats confirmés / 6 réfutés → corrigés (voir notes).

### Completion Notes List

- **SSV robuste** : `convex/http.ts` (route `GET /admob-ssv`) → `convex/adsNode.ts` (`"use node"`, vérif ECDSA/SHA-256, sig DER base64url, clés PEM Google) → `convex/ads.ts creditReward` (interne). Le client ne crédite jamais.
- **Client** : `src/lib/ads.native.ts` (real) / `src/lib/ads.ts` (web no-op) — split Metro, bundle web ne référence jamais la lib. `showRewarded(userId)` passe `serverSideVerificationOptions.userId = me._id`. UI carte Profil « Gagner des jetons » (+20, N/3), init au boot (`_layout`).
- **Anti-inflation** : plafond **3/jour calendaire (UTC)** + montant **20 autoritatif serveur** (indépendant de la config AdMob) + **idempotence** par `transactionId` (table `adRewards`).
- **Corrigé après revue** : (1) 🔴 crash iOS au boot (pas d'`iosAppId`) → `isAdsSupported = Platform.OS === 'android'` (iOS = no-op tant que non configuré) ; (2) 🔴 `showRewarded` bloqué à l'infini si la pub ne charge jamais → **timeout 30 s** garantissant la résolution ; (3) 🟡 clés de vérif : URL canonique `www.gstatic.com` + `res.ok` + **refetch-on-miss** (rotation) + **HTTP 500 sur erreur transitoire** (AdMob retente au lieu de perdre le crédit) ; (4) 🟡 bouton actif en flash pendant le chargement du quota → désactivé tant que `adsRemaining === undefined`.
- **Résiduel assumé** : quota = jour **calendaire UTC** (choix PO) → double-dip borné possible à la frontière minuit UTC (max 6 pubs/+120 🪙 une fois/nuit, jetons virtuels). Fermable en une ligne par une fenêtre glissante 24 h si souhaité plus tard.

### File List

- `convex/schema.ts` (table `adRewards`)
- `convex/ads.ts` (nouveau — `creditReward` interne + `adRewardsRemaining`)
- `convex/adsNode.ts` (nouveau — `"use node"` vérif SSV)
- `convex/http.ts` (nouveau — router endpoint SSV `/admob-ssv`)
- `convex/node-runtime.d.ts` (nouveau — types Node pour le tsc de l'app)
- `src/lib/ads.ts` (nouveau — wrapper web no-op) + `src/lib/ads.native.ts` (nouveau — impl. AdMob)
- `src/lib/analyticsEvents.ts` (event `ad_reward_watched`)
- `src/app/_layout.tsx` (init pub au boot)
- `src/app/(app)/(tabs)/profile.tsx` (carte « Gagner des jetons »)
- `app.json` (plugin `react-native-google-mobile-ads` + `androidAppId`)
- `tsconfig.json` (rien retiré ; types Node via `node-runtime.d.ts`)
