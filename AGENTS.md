# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any code.

---

# AGENTS.md — Djassa Foot 🇨🇮🔥

> Fichier de règles persistant lu par l'IA (Cursor / Claude Code / Codex) **à chaque session**.
> Méthode : « Practical Vibe Coding » (JS Mastery). Le contexte est chargé en amont, on code par petites tâches.
> **Prose en français, tout le code / les identifiants / les commandes en anglais.**

---

## 1. Le produit

**Djassa Foot** est une app mobile (web-first) de **pronostics foot** à identité ivoirienne, centrée sur la **Coupe du Monde 2026**.

- Flow inspiré d'**Apple Sports**, DA **bleue** (style Tejtips) + accent **rouge**.
- L'utilisateur **pronostique** des matchs (1X2, score exact, buteur) en misant des **flammes 🔥**.
- Les **flammes sont une monnaie 100 % virtuelle** : **aucun gain réel, aucun argent réel, aucun pari d'argent.**
- Classement entre amis, profils, notifications.
- Le design de référence existe déjà (27 écrans) dans **Pencil** (`djassa.pen`) et **Penpot** (projet `djassafoot`). Le logo final est dans `assets/logo/djassafoot.png`.

---

## 2. Règles d'or (NON NÉGOCIABLES)

1. **Argent virtuel uniquement.** Jamais de paiement réel, jamais de retrait, jamais de vente de flammes. Pas de vocabulaire de jeu d'argent réel.
2. **Aucun secret côté client.** Les clés API payantes (TheSportsDB Premium, API-Football…) ne vont **JAMAIS** dans une variable `EXPO_PUBLIC_*` (elles seraient en clair dans le bundle). Elles vivent **côté serveur** : variables d'env **Convex** (pour les `action`/cron) ou routes API Expo serveur.
3. **Web-first, code universel.** On écrit avec les primitives React Native (`<View>`, `<Text>`), **jamais** `<div>`/`<span>`. Le mobile natif réutilisera le même code. Forker le spécifique via `Platform.OS` ou fichiers `.web.tsx` / `.native.tsx`.
4. **Respecter la typographie & la DA** du design (voir `spec.md` › Design tokens). **Pas de jaune/ambre** (l'utilisateur l'a explicitement banni).
5. **Données réelles, jamais inventées.** Les équipes/matchs viennent des API (cf. `spec.md` › Ingestion). Ne jamais coder en dur de fausses équipes.
6. **Toujours suivre `plan.md`** : 1 phase = 1 branche git, tâches petites (≈ un prompt chacune), une « definition of done » par tâche.
7. **L'humain reste l'architecte.** Tu proposes, tu poses des questions de clarification quand un choix est ambigu, tu ne pars pas en sur-ingénierie.

---

## 3. Stack — versions VÉRIFIÉES le 2026-06-26

| Brique | Rôle | Version exacte | Notes critiques |
|---|---|---|---|
| **Expo (SDK 56)** | Framework RN, web-first | SDK `56.0.0` (RN 0.85, react-native-web 19.2.3) | Node ≥ 22.13. Bundler = **Metro** (plus de Webpack). |
| **Expo Router** | Routing par fichiers | inclus SDK 56 | Dossier `app/`, `_layout.tsx`, groupes `(group)`, dynamiques `[id].tsx`. |
| **Convex** | Backend réactif + DB + cron | npm `convex@1.42.0` | DB temps réel, `query`/`mutation`/`action`, crons. |
| **Clerk** | Auth | `@clerk/clerk-expo@2.19.31` | Alias `@clerk/expo` dans la doc = même SDK. Email + Google + Apple. |
| **NativeWind** | Styling (Tailwind) | `nativewind@4.2.6` | ⚠️ **PAS la v5 (preview)**. Tailwind **doit rester v3** : `tailwindcss@^3.4.17`. |
| **Zustand** | State client | `zustand@5.0.14` | `persist` + `@react-native-async-storage/async-storage` sur natif. |
| **PostHog** | Analytics | `posthog-react-native@4.53.0` | ⚠️ Sur **web** utiliser **`posthog-js`** (le SDK RN ne marche pas sur web). Split par `Platform.OS`. |
| _(plus tard)_ AdMob | Pubs récompensées → flammes | natif only | Phase 9, build natif requis. |
| _(plus tard)_ Expo Notifications | Push | natif only | Phase 9. |

> Données foot : voir la mémoire projet `projet-cdm2026-data` (TheSportsDB Premium v2 `X-API-KEY`, API-Football en secours).

---

## 4. Commandes

```bash
# Création du projet (à faire une seule fois, Phase 0)
npx create-expo-app@latest --template default@sdk-56 .

# Dév web-first
npx expo start --web          # ou: npx expo start puis touche "w"
npx expo start -c             # vider le cache Metro après modif tailwind/babel/metro

# Convex (laisser tourner dans un terminal séparé en permanence)
npx convex dev                # génère convex/_generated, sync le schéma
npx convex env set KEY value  # définir un secret côté serveur

# Build web prod
npx expo export --platform web

# Lint
npx expo lint
```

---

## 5. Conventions

- **Structure** : routing dans `app/` (Expo Router). Backend dans `convex/`. UI réutilisable dans `components/`. State dans `store/` (Zustand). Données statiques/seed dans `data/`. Types dans `types/`. Tokens/design dans `constants/`. Détail complet dans `spec.md`.
- **Styling** : 100 % **NativeWind** via `className`. Les couleurs de marque sont des tokens Tailwind (`tailwind.config.js` › `theme.extend.colors`). Pas de styles inline sauf cas dynamique impossible en classe.
- **State** : **Convex** pour TOUTES les données serveur (matchs, pronos, flammes, classement) — réactif, pas de fetch manuel. **Zustand** seulement pour l'état **UI/client** (onglet sélectionné, brouillon de prono, prefs, thème).
- **Données serveur** : `useQuery(api...)` pour lire (réactif), `useMutation` pour écrire. Seules les **`action`** Convex peuvent `fetch()` une API externe. Les **crons** appellent uniquement des fonctions **internes**.
- **Perf Convex** : toujours `.withIndex(...)` (jamais `.filter()` sur de grosses tables) — surtout pour le classement.
- **Auth** : `<ClerkProvider>` (externe) ⊃ `<ConvexProviderWithClerk>` (interne). Lire l'utilisateur dans les fonctions Convex via `ctx.auth.getUserIdentity()`.
- **Nommage events PostHog** : snake_case cohérent (`prediction_placed`, `match_viewed`, `daily_bonus_claimed`). `identify(clerkUserId)` après login, `reset()` au logout.
- **Langue UI** : français (copie produit). Code, commentaires techniques, noms de variables : anglais.

---

## 6. Quand ta connaissance est périmée (technique JS Mastery)

Si tu n'es pas sûr d'une API récente (Clerk, Convex, Expo…), **ne devine pas**. Récupère la doc officielle à jour et colle-la dans le prompt **après** les instructions, séparée par un `---`. Sources machine-readable officielles :

### Docs IA / llms.txt / skills officiels (vérifiés le 2026-06-26)

| Brique | llms.txt / doc IA | Skills / outils IA officiels |
|---|---|---|
| **Expo** | `https://docs.expo.dev/llms.txt` · `https://docs.expo.dev/llms-full.txt` · SDK: `https://docs.expo.dev/llms-sdk.txt` · `https://docs.expo.dev/agents.md` · `https://docs.expo.dev/skills.md` | **Expo Skills** (16) : `/plugin install expo@claude-plugins-official` — dont `expo-tailwind-setup`, `native-data-fetching`, `expo-api-routes`, `expo-deployment`. |
| **Convex** | Règles : `https://convex.link/convex_rules.txt` · Guidelines : `https://www.convex.dev/llms.txt` · Hub IA : `https://docs.convex.dev/ai` | `npx convex ai-files install` (écrit guidelines + sections AGENTS.md/CLAUDE.md) · **Agent Skills** : `npx skills add get-convex/agent-skills` · **MCP** : `claude mcp add-json convex '{"type":"stdio","command":"npx","args":["convex","mcp","start"]}'` |
| **Clerk** | `https://clerk.com/docs/llms.txt` · full (24 Mo) : `https://clerk.com/docs/llms-full.txt` · page → ajouter `.md` (ex. `https://clerk.com/docs/quickstarts/expo.md`) | **Clerk Skills** : `npx skills add clerk/skills` (router + `clerk-setup`, `clerk-expo-patterns`, `clerk-orgs`, `clerk-webhooks`, `clerk-testing`…) · doc `https://clerk.com/docs/guides/ai/skills` · repo `github.com/clerk/skills` · CLI `https://clerk.com/docs/cli.md` |
| **NativeWind** | `https://www.nativewind.dev/llms.txt` · `https://www.nativewind.dev/llms-full.txt` | — |
| **Zustand** | _(pas de llms.txt)_ | Réf. : `https://github.com/pmndrs/zustand` + `https://zustand.docs.pmnd.rs/` |
| **PostHog** | `https://posthog.com/llms.txt` · page → ajouter `.md` (ex. `https://posthog.com/docs/libraries/react-native.md`) | **MCP** : `npx @posthog/wizard mcp add` (`https://mcp.posthog.com/mcp`) |

> ⚠️ N'existent **PAS** (ne pas les linker) : `convex.dev/llms-full.txt`, `posthog.com/llms-full.txt`.

### Skills officiels à installer en Phase 0
```bash
# Convex : guidelines + skills + (option) MCP
npx convex ai-files install
npx skills add get-convex/agent-skills
# Clerk : skills officiels (router + clerk-setup, clerk-expo-patterns, clerk-orgs, clerk-webhooks, clerk-testing…)
npx skills add clerk/skills
# Expo : plugin de skills pour Claude Code
/plugin install expo@claude-plugins-official
```

---

## 7. Docs officielles de référence (humain)

- Expo : https://docs.expo.dev/ · Router : https://docs.expo.dev/router/introduction/ · Web : https://docs.expo.dev/workflow/web/ · Env : https://docs.expo.dev/guides/environment-variables/
- Convex : https://docs.convex.dev/ · React Native : https://docs.convex.dev/quickstart/react-native · Clerk : https://docs.convex.dev/auth/clerk · Schémas : https://docs.convex.dev/database/schemas · Crons : https://docs.convex.dev/scheduling/cron-jobs
- Clerk : https://clerk.com/docs · Expo : https://clerk.com/docs/quickstarts/expo · Convex : https://clerk.com/docs/integrations/databases/convex
- NativeWind : https://www.nativewind.dev/docs/getting-started/installation
- Zustand : https://zustand.docs.pmnd.rs/ · persist : https://zustand.docs.pmnd.rs/reference/middlewares/persist
- PostHog : https://posthog.com/docs/libraries/react-native

> Détails d'architecture & modèle de données : voir **`spec.md`**. Plan d'exécution par phases : voir **`plan.md`**.
