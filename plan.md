# plan.md — Djassa Foot · Plan d'exécution

> Méthode : **1 phase = 1 branche git**, tâches petites (≈ un prompt chacune), chaque tâche a une **Definition of Done (DoD)**.
> On code une phase à la fois, on merge sur `main` quand la DoD de la phase est verte, puis on met à jour ce fichier.
> Règles : `AGENTS.md`. Archi & data model : `spec.md`.

Légende : `[ ]` à faire · `[~]` en cours · `[x]` fait.

---

## Phase 0 — Setup & fondations  ·  branche `phase-0-setup`
**But** : projet Expo web-first qui démarre, avec styling, state, et skills IA installés.

- [x] `npx create-expo-app@latest --template default@sdk-56 djassafoot` ✓ (SDK 56, structure `src/`)
- [x] Installer skills/guidelines IA : `npx skills add get-convex/agent-skills` · `npx skills add clerk/skills` · `/plugin install expo@claude-plugins-official` _(à lancer toi-même dans ton IDE ; `npx convex ai-files install` viendra avec Convex en Phase 1)_
- [x] NativeWind v4 ✓ : `tailwind.config.js` (preset + globs `./src/**/*`) + `src/global.css` (@tailwind) + `babel.config.js` (`jsxImportSource: 'nativewind'`) + `metro.config.js` (`withNativeWind`, input `./src/global.css`) + `import '@/global.css'` dans `_layout.tsx` + `app.json` `web.bundler: "metro"` + `nativewind-env.d.ts` (+ déclarations CSS)
- [x] Tokens design ✓ : couleurs DA dans `tailwind.config.js` + polices **Montserrat + Inter** via `@expo-google-fonts/*` + `useFonts`
- [x] Zustand ✓ : `src/store/prefsStore.ts` (thème/langue/onboarding) avec `persist` + AsyncStorage
- [x] `.env` + `.env.example` + `.gitignore` (`.env` ignoré ; aucun secret) ✓

**DoD** : ✅ `npx expo export --platform web` bundle sans erreur · écran de marque stylé NativeWind rendu · Montserrat/Inter chargées · `tsc --noEmit` clean. → lancer `npm run web` pour voir.

---

## Phase 1 — Auth (Clerk + Convex)  ·  branche `phase-1-auth`
**But** : un utilisateur peut s'inscrire/se connecter, et est synchronisé dans Convex.

- [x] Init Convex (`npx convex dev`), `EXPO_PUBLIC_CONVEX_URL`, client `ConvexReactClient`
- [x] Clerk : app + `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` + template JWT `convex`
- [x] `convex/auth.config.ts` + var Convex `CLERK_JWT_ISSUER_DOMAIN`
- [x] Providers `app/_layout.tsx` : Clerk (externe) ⊃ ConvexProviderWithClerk (interne)
- [x] Écrans `(auth)/sign-in` + `sign-up` (email + Google + Apple), DA du design
- [x] Garde de routes : `(auth)/_layout` et `(tabs)/_layout` via `useAuth()`
- [x] `convex/users.ts` : `getOrCreateUser` (lit `getUserIdentity`, crée la ligne + `signup_bonus` +1000)

**DoD** : inscription → user créé dans Convex avec 1000 🔥 → redirigé vers l'app ; déconnexion fonctionne ; refresh garde la session.

---

## Phase 2 — Modèle de données & ingestion  ·  branche `phase-2-data`
**But** : les vrais matchs CdM 2026 arrivent dans Convex automatiquement.

- [x] `convex/schema.ts` complet (tables de `spec.md` §3 + index)
- [x] Secrets Convex : `THESPORTSDB_KEY`, `FOOTBALL_API_KEY` (`npx convex env set`)
- [x] `convex/football.ts` : `internalAction` `syncFixtures` + `ingestLive` (fetch + `upsert` mutations)
- [x] `convex/crons.ts` : fixtures quotidien + live toutes les 2 min
- [x] `convex/matches.ts` : queries `upcoming`, `live`, `byId`

**DoD** : la table `matches` se remplit de vrais matchs CdM 2026 ; les scores live se mettent à jour seuls ; aucun secret côté client.

---

## Phase 3 — Navigation & Accueil  ·  branche `phase-3-home`
**But** : la coquille de l'app + l'écran d'accueil avec données réelles.

- [x] `(tabs)/_layout` : bottom tabs (Accueil · Matchs · Pronos · Classement · Profil) + `TabBar` custom
- [x] `FlameBalance` (solde 🔥 en header, réactif)
- [x] Accueil : match en vedette + carrousel + section « Matchs en vedette » (`MatchCard`)
- [x] `(tabs)/matches` : liste/calendrier des matchs

**DoD** : l'app navigue entre les 5 onglets ; l'accueil affiche de vrais matchs ; le solde de flammes est correct et réactif.

---

## Phase 4 — Détail match & flow de prono  ·  branche `phase-4-prono`
**But** : le cœur produit — pronostiquer en misant des flammes.

- [x] `match/[id]` : détail + terrain/compos (inspiré API-Football, pastilles 22px avec photos/avatar neutre)
- [x] `store/pronoDraftStore.ts` : brouillon (type, sélection, mise)
- [x] `prono/[matchId]` : 1X2 / score exact / **choix du buteur** + slider de mise en flammes
- [x] `convex/predictions.ts` : `placePrediction` (débit `prediction_stake`, crée la prediction `pending`)
- [x] Écrans « Prono Confirmed » (dégradé vert du design)
- [x] `(tabs)/pronos` : mes pronos (en cours / résolus)

**DoD** : poser un prono débite les flammes, crée la prediction ; impossible de miser plus que son solde ; « Prono Confirmed » s'affiche.

---

## Phase 5 — Résolution & économie de flammes  ·  branche `phase-5-flames`
**But** : les pronos se résolvent et l'économie tourne.

- [x] `convex/settlement.ts` : à match `finished`, résoudre les `pending` (won/lost, crédit gains, MAJ `points`)
- [x] Brancher settlement dans le cron après MAJ d'un match terminé
- [x] `convex/flames.ts` : `claimDailyBonus` (anti-abus via `lastDailyBonusAt`, streak)
- [x] Historique `flameTransactions` sur le profil

**DoD** : un match terminé résout automatiquement les pronos et crédite les gagnants ; le bonus quotidien est réclamable 1×/24 h.

---

## Phase 6 — Classement & amis  ·  branche `phase-6-social`
- [~] `convex/leaderboard.ts` : classement réactif (`.withIndex('by_points')`, global + amis)
- [~] `(tabs)/leaderboard` : UI classement
- [~] `convex/friends.ts` : invitations + acceptation ; `team/[id]`, `search`

**DoD** : le classement se met à jour en temps réel quand les points changent ; on peut ajouter un ami et voir un classement filtré.

---

## Phase 7 — Profil, notifications & polish  ·  branche `phase-7-profile`
- [ ] `(tabs)/profile` : infos Clerk, solde, historique, streak, déconnexion
- [ ] `notifications` : in-app (kickoff proche, prono résolu, activité amis)
- [ ] Onboarding complet + écran « compétition verrouillée » (flow indispo)
- [ ] Passe de cohérence visuelle vs design Penpot

**DoD** : profil complet, notifications in-app fonctionnelles, parcours fidèle au design.

---

## Phase 8 — Analytics (PostHog)  ·  branche `phase-8-analytics`
- [ ] `lib/analytics.ts` : wrapper split `posthog-js` (web) / `posthog-react-native` (natif)
- [ ] `identify(clerkUserId)` après login, `reset()` au logout
- [ ] Events : `onboarding_started`, `prediction_placed`, `match_viewed`, `daily_bonus_claimed`, `friend_added`
- [ ] Funnels onboarding + rétention dans PostHog

**DoD** : les events clés remontent dans PostHog, rattachés au bon utilisateur ; un funnel onboarding est visible.

---

## Phase 9 — Build natif : pubs & push  ·  branche `phase-9-native`
> Première vraie sortie d'Expo Go (cf. le passage 2h35 du tuto : Xcode/Android Studio).

- [ ] `npx expo run:ios` / `run:android` (signing / Team Apple) — build de dev natif
- [ ] AdMob : pub récompensée → `+50 🔥` (`ad_reward`, cap journalier) — natif only
- [ ] Expo Notifications : permissions + push (rappels match, prono résolu)

**DoD** : l'app tourne en build natif sur simulateur/appareil ; regarder une pub crédite des flammes ; un push de test arrive.

---

## Phase 10 — Ship  ·  branche `phase-10-release`
- [ ] Build web prod (`npx expo export --platform web`) + déploiement (EAS Hosting)
- [ ] EAS Build iOS/Android + soumission stores
- [ ] QA finale, vérif « 0 secret côté client », mentions « monnaie virtuelle »

**DoD** : web en ligne accessible par lien ; builds stores soumis.

---

### Rituel de session (Practical Vibe Coding)
1. Lire `AGENTS.md` + la phase courante de `plan.md`.
2. Prendre **une** tâche, créer/continuer la branche de phase.
3. Si doute sur une API → coller la doc officielle à jour (cf. `AGENTS.md` §6).
4. Coder, vérifier la DoD, commit. Mettre à jour `plan.md`/`spec.md` si une décision change.
