// Règles anti-paris-illégaux (partagées client + serveur).
// Un pari porte sur UN match avec plusieurs "legs" (1 par marché). Certaines combinaisons sont
// logiquement impossibles (ex. « Plus de 2,5 buts » + score exact « 2-0 ») → à refuser.

export type LegSel = { market: string; pick: string };

const MAXG = 9; // les steppers de score exact vont de 0 à 9

// Un score (h,a) satisfait-il ce leg ?
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
      return true; // marché inconnu : déjà rejeté par bets.place, on ne bloque pas ici
  }
}

// Existe-t-il AU MOINS un score satisfaisant TOUS les legs ? (satisfiabilité)
export function areLegsConsistent(legs: LegSel[]): boolean {
  if (legs.length === 0) return true;
  for (let h = 0; h <= MAXG; h++) {
    for (let a = 0; a <= MAXG; a++) {
      if (legs.every((l) => scoreSatisfiesLeg(h, a, l))) return true;
    }
  }
  return false;
}

// Valide un ensemble de legs :
//  R1 — le score exact est EXCLUSIF (il détermine déjà tout → pas de combinaison).
//  R2 — la combinaison doit être satisfiable (aucun triplet impossible).
export function validateLegs(legs: LegSel[]): { ok: true } | { ok: false; reason: string } {
  const hasExact = legs.some((l) => l.market === 'exact_score');
  if (hasExact && legs.length > 1) {
    return { ok: false, reason: 'Le score exact ne se combine pas avec un autre pari.' };
  }
  if (!areLegsConsistent(legs)) {
    return { ok: false, reason: 'Combinaison de pronostics impossible (contradictoire).' };
  }
  return { ok: true };
}

// Pour l'UI : ajouter `candidate` à la sélection courante resterait-il valide ?
// (on remplace la sélection existante du même marché, comme le fait toggleLeg)
export function isPickCompatible(currentLegs: LegSel[], candidate: LegSel): boolean {
  const others = currentLegs.filter((l) => l.market !== candidate.market);
  return validateLegs([...others, candidate]).ok;
}
