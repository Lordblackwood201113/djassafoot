# Story 1.1 : Empêcher les paris illégaux (combinaisons contradictoires)

Status: ready-for-review

<!-- Créée hors scaffolding BMAD (projet sans epics/sprint-status). Auto-suffisante pour dev-story. -->

## Story

As a **joueur de Djassa Foot**,
I want que l'application **refuse toute combinaison de pronostics logiquement impossible sur un même match** (côté écran ET côté serveur),
so that je **ne puisse jamais placer un pari contradictoire** (ex. « Plus de 2,5 buts » avec un score exact « 2-0 »), et que les gains restent équitables.

## Contexte & problème

Un pari Djassa Foot porte sur **UN seul match** et peut contenir **plusieurs sélections (legs)**, une par marché — c'est un **« same‑game multi »** (pari combiné intra‑match), pas un accumulateur multi‑matchs.

- Store brouillon : `src/store/pronoDraftStore.ts` → `legs: Record<Market, Leg>` (une sélection par marché).
- Marchés (`Market`) : `result_1x2`, `over_under_2_5`, `btts`, `exact_score`.
- Mutation de pose : `convex/bets.ts` → `place`.

**Ce qui est déjà validé** (`convex/bets.ts:216-240`) : match non commencé, mise entière > 0 et ≤ solde, marché connu, **un seul choix par marché** (`seen`), au moins une sélection.

**Ce qui MANQUE (la faille)** : aucune vérification de **cohérence logique entre marchés**. La cote totale est le **produit** des cotes des legs (`convex/bets.ts:242`). On peut donc :
- poser un pari **contradictoire** (aucun score ne peut satisfaire toutes les sélections) → gain garanti à 0, expérience cassée ; et
- poser un pari **redondant/corrélé** (ex. « victoire domicile » + « score 2‑0 ») dont la cote est **artificiellement gonflée** par la multiplication de cotes corrélées.

## Documentation EXHAUSTIVE des éléments illégaux

Formats de picks (confirmés dans le code) :
- `result_1x2` : `'home'` | `'draw'` | `'away'`
- `over_under_2_5` : `'over'` (total buts ≥ 3) | `'under'` (total buts ≤ 2)
- `btts` : `'yes'` (les deux marquent) | `'no'`
- `exact_score` : `"H-A"` avec H, A ∈ 0..9 (steppers de `prono/[matchId].tsx:113`), ex. `"2-0"`

Pour un score (h, a), les vérités de chaque leg :
| Marché | pick | Vrai ssi |
|---|---|---|
| result_1x2 | home / draw / away | h>a / h=a / h<a |
| over_under_2_5 | over / under | h+a ≥ 3 / h+a ≤ 2 |
| btts | yes / no | (h≥1 ∧ a≥1) / (h=0 ∨ a=0) |
| exact_score | "H-A" | h=H ∧ a=A |

**Définition : une combinaison est ILLÉGALE ⟺ il n'existe AUCUN score (h,a) qui rend TOUS les legs vrais simultanément.**

### A. Contradictions impliquant `exact_score` (classe principale — l'exemple de l'utilisateur)
Le score exact fige (h,a) ; tout autre leg doit être cohérent avec lui, sinon illégal :
- **exact + over_under** : illégal si `over` et H+A ≤ 2 (ex. **2‑0 + « Plus de 2,5 »** ← l'exemple) ; ou `under` et H+A ≥ 3 (ex. 3‑1 + « Moins de 2,5 »).
- **exact + result_1x2** : illégal si `home` et H≤A ; `draw` et H≠A ; `away` et H≥A (ex. 2‑0 + « Nul » ou « victoire extérieur »).
- **exact + btts** : illégal si `yes` et (H=0 ∨ A=0) (ex. 2‑0 + « les deux marquent ») ; `no` et (H≥1 ∧ A≥1) (ex. 1‑1 + « pas les deux »).

> Note corrélation : même **cohérent**, `exact_score` combiné à un autre marché est **redondant** (le score exact implique déjà le résultat, le total, le btts) et **gonfle la cote** via la multiplication. → On traite `exact_score` comme **EXCLUSIF** (voir Règle R1).

### B. Contradictions SANS `exact_score` (triples impossibles — non couverts par un simple check pairwise)
Aucune **paire** parmi {result, over/under, btts} n'est contradictoire, mais certains **triplets** le sont :
- **`home` + `btts=yes` + `under`** : victoire domicile + les deux marquent ⟹ h≥2, a≥1 ⟹ total ≥ 3 ⟹ jamais `under`. **ILLÉGAL.**
- **`away` + `btts=yes` + `under`** : symétrique ⟹ a≥2, h≥1 ⟹ total ≥ 3. **ILLÉGAL.**
- **`draw` + `btts=no` + `over`** : nul + pas‑les‑deux ⟹ 0‑0 ⟹ total 0 ⟹ jamais `over`. **ILLÉGAL.**

(Tous les autres triplets ont au moins un score satisfaisant, ex. `draw`+`btts=yes`+`under` = 1‑1.)

**Conclusion d'ingénierie :** les contradictions sont **combinatoires** (pas seulement pairwise). La seule méthode robuste et pérenne (résistante à l'ajout de futurs marchés) est un **vérificateur de satisfiabilité** : énumérer les scores 0..N et vérifier qu'au moins un satisfait TOUS les legs.

## Règles retenues

- **R1 — `exact_score` est EXCLUSIF.** Si un score exact est sélectionné, c'est la **seule** sélection du pari (aucun autre marché). Élimine d'un coup toutes les contradictions du groupe A **et** la corrélation/gonflage de cote.
- **R2 — Satisfiabilité pour le reste.** Pour les combinaisons sans score exact (result / over‑under / btts), refuser toute combinaison **insatisfiable** (couvre les triplets du groupe B et tout cas futur).

L'implémentation de R2 (satisfiabilité) **couvre aussi** R1 sur le plan de la contradiction ; R1 ajoute l'aspect **exclusivité** (anti‑redondance/anti‑gonflage) que la satisfiabilité seule ne traite pas.

## Acceptance Criteria

1. **Serveur autoritatif** — `convex/bets.ts › place` REFUSE (throw explicite) tout pari dont les legs sont incohérents (R1 + R2). Le contrôle client ne suffit jamais.
   - Given des legs `[over_under=over, exact_score="2-0"]`, When `place`, Then throw « Combinaison de pronostics impossible » et **aucun débit** de jetons, **aucun** `bets` inséré.
   - Given `[result=home, btts=yes, over_under=under]`, When `place`, Then throw (triplet impossible).
   - Given `[exact_score="2-0", result=home]` (cohérent mais R1), When `place`, Then throw « Le score exact ne se combine pas avec un autre pari ».
   - Given une combinaison **valide** (ex. `[result=home, over_under=over]` ou `[exact_score="2-1"]` seul), When `place`, Then le pari est créé normalement.
2. **Fonction partagée** — la logique de cohérence vit dans un module **importable par le client ET le serveur** (`convex/betRules.ts`), avec tests unitaires couvrant les groupes A et B ci‑dessus.
3. **UI prono (`prono/[matchId].tsx`)** — impossible de **construire** une combinaison illégale :
   - Quand un `exact_score` est actif, les autres marchés (1N2, buts, btts) sont **désactivés/grisés** avec un indice « Score exact sélectionné » ; et inversement, activer un autre marché grise le bloc score exact. (R1 côté UX.)
   - Sans score exact, une option qui rendrait la combinaison **insatisfiable** est **désactivée/grisée** (R2), au lieu d'être sélectionnable.
4. **Slip (`prono/slip.tsx`)** — le bouton « Placer le pari » est **bloqué** si la combinaison est incohérente, avec message clair ; et l'erreur serveur éventuelle est affichée proprement (pas de crash).
5. **Aucune régression** — les paris légaux existants (1 seul marché, ou combinaisons cohérentes) fonctionnent comme avant ; cotes/gains inchangés pour eux.

## Tasks / Subtasks

- [ ] **T1 — Module de règles partagé** (AC: 2) — créer `convex/betRules.ts`
  - [ ] `type LegSel = { market: string; pick: string }`
  - [ ] `scoreSatisfiesLeg(h, a, leg): boolean` (table de vérité ci‑dessus ; parser `exact_score` via `pick.split('-').map(Number)`, cohérent avec `legOdds` `convex/bets.ts:81`)
  - [ ] `areLegsConsistent(legs: LegSel[]): boolean` — énumère `h,a ∈ 0..MAXG` (MAXG = 9, cf. steppers), renvoie `true` s'il existe un score satisfaisant tous les legs
  - [ ] `validateLegs(legs): { ok: true } | { ok: false; reason: string }` — applique **R1** (si un `exact_score` est présent ET `legs.length > 1` → `reason` « Le score exact ne se combine pas avec un autre pari ») puis **R2** (`areLegsConsistent` faux → « Combinaison de pronostics impossible »)
  - [ ] `isPickCompatible(currentLegs: LegSel[], candidate: LegSel): boolean` — pour l'UI : `validateLegs([...current filtrés du même marché, candidate]).ok`
    - Note dev : comme `validateLegs` applique **R1**, `isPickCompatible` grise **automatiquement** les autres marchés quand un score exact est actif (et inversement). **Ne PAS coder de cas spécial `exact_score` dans l'UI** : un seul `isPickCompatible` par bouton suffit pour R1 **et** R2.
- [ ] **T2 — Blocage serveur** (AC: 1, 5) — `convex/bets.ts › place`
  - [ ] Après la construction de `computed` et AVANT le débit (`ctx.db.patch(user._id, …)` ligne ~246), appeler `validateLegs(legs)` ; si `!ok` → `throw new Error(reason)` (donc pas de débit, pas d'insert)
  - [ ] Importer depuis `./betRules`
- [ ] **T3 — UI prono** (AC: 3) — `src/app/(app)/prono/[matchId].tsx`
  - [ ] Calculer, pour chaque `OddButton`, `disabled = !isPickCompatible(currentLegs, candidate)` (le leg déjà sélectionné du même marché reste toujours ré‑sélectionnable/désélectionnable)
  - [ ] Griser (opacity + non‑pressable) les options incompatibles ; petit indice sous la section
  - [ ] `exact_score` actif ⟹ griser 1N2/buts/btts ; un autre marché actif ⟹ griser le bloc score exact (R1)
  - [ ] Passer `disabled` à `OddButton` (nouvelle prop) et adapter le style
- [ ] **T4 — Slip** (AC: 4) — `src/app/(app)/prono/slip.tsx`
  - [ ] Bloquer « Placer » si `!validateLegs(legs).ok` + afficher `reason`
  - [ ] `try/catch` sur `place` : afficher l'erreur serveur (ne pas crasher)
- [ ] **T5 — Tests** (AC: 2) — voir « Testing » ci‑dessous (au minimum les 6 cas des AC + les 3 triplets du groupe B + cas valides)
- [ ] **T6 — Vérif** — `npx tsc --noEmit`, `npx convex codegen`, `npm run build` verts ; test manuel : 2‑0 + « Plus de 2,5 » impossible à sélectionner ET refusé serveur.

## Dev Notes

### Où est la faille (source)
- `convex/bets.ts:216-240` — `place` valide « un seul choix par marché » (`seen`) mais **jamais** la cohérence inter‑marchés. **C'est le point d'insertion serveur (T2).**
- `src/store/pronoDraftStore.ts:24-31` — `toggleLeg` remplace la sélection du marché ; ne connaît pas la cohérence.
- `src/app/(app)/prono/[matchId].tsx:167-368` — chaque marché a ses `OddButton`/le bloc score exact ; `selectedCount = Object.keys(legs).length`. **Point d'insertion UI (T3).**
- `legOdds` `convex/bets.ts:71-87` — parse `exact_score` avec `pick.split('-')` ; **reproduire exactement** ce parsing dans `scoreSatisfiesLeg`.

### Approche satisfiabilité (pseudo‑code de référence)
```ts
// convex/betRules.ts
export type LegSel = { market: string; pick: string };
const MAXG = 9; // steppers 0..9

export function scoreSatisfiesLeg(h: number, a: number, leg: LegSel): boolean {
  switch (leg.market) {
    case 'result_1x2':
      return leg.pick === 'home' ? h > a : leg.pick === 'away' ? h < a : h === a;
    case 'over_under_2_5':
      return leg.pick === 'over' ? h + a >= 3 : h + a <= 2;
    case 'btts':
      return leg.pick === 'yes' ? h >= 1 && a >= 1 : h === 0 || a === 0;
    case 'exact_score': {
      const [H, A] = leg.pick.split('-').map((n) => parseInt(n, 10));
      return h === (H || 0) && a === (A || 0);
    }
    default:
      return true; // marché inconnu → ne bloque pas ici (déjà rejeté par `place`)
  }
}

export function areLegsConsistent(legs: LegSel[]): boolean {
  for (let h = 0; h <= MAXG; h++)
    for (let a = 0; a <= MAXG; a++)
      if (legs.every((l) => scoreSatisfiesLeg(h, a, l))) return true;
  return false;
}

export function validateLegs(legs: LegSel[]): { ok: true } | { ok: false; reason: string } {
  const hasExact = legs.some((l) => l.market === 'exact_score');
  if (hasExact && legs.length > 1)
    return { ok: false, reason: 'Le score exact ne se combine pas avec un autre pari.' };
  if (!areLegsConsistent(legs))
    return { ok: false, reason: 'Combinaison de pronostics impossible (contradictoire).' };
  return { ok: true };
}
```
> Réutilisabilité : le client importe déjà depuis `@convex/*` (ex. `@convex/oddsShared` dans `prono/[matchId].tsx:4`). Donc `convex/betRules.ts` est importable client + serveur sans duplication.

### Décision produit
- **R1 (score exact exclusif)** est un choix de game‑design conforme aux bookmakers (un « correct score » ne se combine pas au reste du même match car totalement corrélé). Il supprime aussi le **gonflage de cote** par corrélation. Si le PO préfère autoriser des combinaisons corrélées cohérentes, il faudrait à la place **pricer** la cote jointe (probabilité Poisson conjointe) au lieu du produit — **plus complexe, hors scope de cette story** ; documenter comme évolution possible.
- Le seuil over/under est **2,5** : `over` = total ≥ 3, `under` = total ≤ 2 (jamais d'égalité possible sur une ligne .5).

### Testing standards
- Pas de framework de test configuré dans le repo (aucun `test`/`jest`/`vitest` dans `package.json`). **Deux options** (au choix du dev, la 1re est suffisante pour cette story) :
  1. Fichier de vérification autonome exécutable (`node`/`tsx`) dans `scripts/` qui assert les cas et sort code ≠ 0 en cas d'échec ; l'appeler à la main. Rapide, zéro dépendance.
  2. Introduire `vitest` (dev‑dep) + `convex/betRules.test.ts`. À ne faire que si le PO veut une suite de tests pérenne.
- **Cas obligatoires** : les 6 AC ; les 3 triplets du groupe B (illégaux) ; au moins 4 combinaisons valides (`[home]`, `[home, over]`, `[draw, btts=yes, under]`=1‑1, `[exact "2-1"]`).
- Vérif build : `npx tsc --noEmit` + `npx convex codegen` + `npm run build` doivent rester verts.

### Project Structure Notes
- Nouveau fichier : `convex/betRules.ts` (règles partagées). Convention : logique métier réutilisable dans `convex/` (cf. `convex/oddsShared.ts` déjà importé côté client).
- Fichiers modifiés : `convex/bets.ts` (T2), `src/app/(app)/prono/[matchId].tsx` (T3), `src/app/(app)/prono/slip.tsx` (T4).
- `OddButton` (`prono/[matchId].tsx:20`) gagne une prop `disabled?: boolean`.
- Ne PAS toucher au calcul de cotes/`resolveOdds`/`legOdds` (hors scope) ; on ne fait que **bloquer** des combinaisons, pas repricer.

### References
- Modèle de pari & faille : [convex/bets.ts › place](../../convex/bets.ts) (lignes 210‑256), `legOdds` (71‑87), `MARKETS` (14‑15).
- Store brouillon : [src/store/pronoDraftStore.ts](../../src/store/pronoDraftStore.ts).
- UI de sélection : [src/app/(app)/prono/[matchId].tsx](../../src/app/(app)/prono/%5BmatchId%5D.tsx).
- Slip : [src/app/(app)/prono/slip.tsx](../../src/app/(app)/prono/slip.tsx).
- Cotes partagées (précédent d'import client depuis convex) : [convex/oddsShared.ts](../../convex/oddsShared.ts).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8

### Debug Log References

- Vérif logique (14 cas) : `node scripts/verify-bet-rules.mjs` équivalent inline — **14/14 OK** (7 illégaux bloqués dont l'exemple `over + 2-0` et les 3 triplets ; 4 légaux ; 3 `isPickCompatible`).
- `npx tsc --noEmit` ✅ · `npx convex codegen` ✅ · `npm run build` ✅.

### Completion Notes List

- **Décision finale (retour PO)** : on ne bloque QUE les contradictions (**R2 satisfiabilité**). **R1 (score exact exclusif) a été RETIRÉE** : un score exact PEUT se combiner à un autre pari s'ils sont cohérents (ex. « victoire domicile » + « 2-0 » = OK ; « Plus de 2,5 » + « 2-0 » = refusé). Le grisage UI dépend donc du score choisi. `convex/betRules.ts` (partagé client/serveur, aucune dépendance Convex).
  - Compromis assumé : les cotes de legs corrélés cohérents ne sont pas repricées (produit des cotes) → évolution possible (proba Poisson conjointe).
- Serveur autoritaire : `convex/bets.ts › place` refuse via `validateLegs` **avant** tout débit/insert (fail‑fast, après les validations de base).
- UI `prono/[matchId].tsx` : chaque option (1N2/buts/btts) et le bouton « Ajouter » du score exact sont **grisés + non‑pressables** quand ils rendraient la combinaison illégale (`isPickCompatible`). Une option déjà sélectionnée reste désélectionnable.
- Slip `prono/slip.tsx` : bouton « Valider » bloqué + message de raison si combinaison invalide (miroir du serveur) ; erreurs serveur affichées.
- Aucun changement de pricing (`resolveOdds`/`legOdds` intacts). Aucune régression sur les paris légaux.
- Évolution possible (hors scope) : pricing corrélé (proba Poisson conjointe) pour autoriser des combinaisons cohérentes corrélées au lieu de R1.

### File List

- `convex/betRules.ts` (nouveau — règles partagées)
- `convex/bets.ts` (modifié — import + `validateLegs` dans `place`)
- `src/app/(app)/prono/[matchId].tsx` (modifié — `OddButton.disabled` + `disabledFor`/`exactDisabled`)
- `src/app/(app)/prono/slip.tsx` (modifié — `validateLegs` bloque « Valider » + raison)
