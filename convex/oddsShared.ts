// Moteur de cotes — modèle de Poisson sur les buts attendus (λ) déduits de la force des équipes
// (points en poule). PUR (aucune dépendance serveur) → importé côté Convex ET côté front
// (via l'alias @convex) pour garantir des cotes identiques à l'affichage et à la pose du pari.
const MARGIN = 0.06; // marge maison (garde l'économie de flammes saine)
const MAXG = 8;

export type Lambdas = [number, number];

function poissonPmf(k: number, l: number): number {
  let p = Math.exp(-l);
  for (let i = 1; i <= k; i++) p = (p * l) / i;
  return p;
}

// Force normalisée [0,1] depuis les points de poule (0..9). 0.45 par défaut (équipe inconnue).
export function strengthFromPoints(points?: number): number {
  return points == null ? 0.45 : Math.min(1, Math.max(0, points / 9));
}

// Buts attendus domicile/extérieur (avantage du terrain inclus).
export function lambdasFor(sHome: number, sAway: number): Lambdas {
  const lh = Math.min(3.4, Math.max(0.4, 1.25 + (sHome - sAway) * 1.5 + 0.22));
  const la = Math.min(3.1, Math.max(0.35, 1.12 + (sAway - sHome) * 1.5));
  return [lh, la];
}

function dist([lh, la]: Lambdas) {
  const ph = Array.from({ length: MAXG + 1 }, (_, k) => poissonPmf(k, lh));
  const pa = Array.from({ length: MAXG + 1 }, (_, k) => poissonPmf(k, la));
  return { ph, pa };
}

function toOdds(prob: number, cap = 50): number {
  if (prob <= 0) return cap;
  return Math.min(cap, Math.max(1.04, Math.round(((1 - MARGIN) / prob) * 100) / 100));
}

export type MarketOdds = {
  home: number;
  draw: number;
  away: number;
  over: number;
  under: number;
  bttsYes: number;
  bttsNo: number;
};

export function marketOdds(l: Lambdas): MarketOdds {
  const { ph, pa } = dist(l);
  let home = 0;
  let draw = 0;
  let away = 0;
  let over = 0;
  let bttsYes = 0;
  for (let h = 0; h <= MAXG; h++) {
    for (let a = 0; a <= MAXG; a++) {
      const p = ph[h] * pa[a];
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
      if (h + a > 2) over += p; // > 2.5 buts
      if (h >= 1 && a >= 1) bttsYes += p;
    }
  }
  return {
    home: toOdds(home),
    draw: toOdds(draw),
    away: toOdds(away),
    over: toOdds(over),
    under: toOdds(1 - over),
    bttsYes: toOdds(bttsYes),
    bttsNo: toOdds(1 - bttsYes),
  };
}

// Cote d'un score exact (ex. 2-1).
export function exactOdds(l: Lambdas, h: number, a: number): number {
  const { ph, pa } = dist(l);
  const p = (ph[Math.min(h, MAXG)] ?? 0) * (pa[Math.min(a, MAXG)] ?? 0);
  return toOdds(p, 250);
}

// Cote d'un leg donné (utilisé à la pose du pari, autoritatif).
export function oddsForLeg(l: Lambdas, market: string, pick: string): number {
  const m = marketOdds(l);
  switch (market) {
    case 'result_1x2':
      return pick === 'home' ? m.home : pick === 'away' ? m.away : m.draw;
    case 'over_under_2_5':
      return pick === 'over' ? m.over : m.under;
    case 'btts':
      return pick === 'yes' ? m.bttsYes : m.bttsNo;
    case 'exact_score': {
      const [h, a] = pick.split('-').map((n) => parseInt(n, 10));
      return exactOdds(l, h || 0, a || 0);
    }
    default:
      return 1;
  }
}
