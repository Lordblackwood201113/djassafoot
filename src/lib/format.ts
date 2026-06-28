const FR_MONTHS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];
const FR_MONTHS_LONG = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const FR_DAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];

// Nom de compétition par id API (on n'a que la CdM pour l'instant).
export const COMP_NAME: Record<string, string> = { '4429': 'Coupe du Monde' };

export function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${FR_MONTHS[d.getMonth()]}`;
}

export function formatHeroDate(ms: number): string {
  const d = new Date(ms);
  return `${FR_DAYS[d.getDay()]} ${d.getDate()} ${FR_MONTHS[d.getMonth()]} · ${formatTime(ms)}`;
}

// "Ven. 26 juin"
export function formatDayLong(ms: number): string {
  const d = new Date(ms);
  return `${FR_DAYS[d.getDay()]} ${d.getDate()} ${FR_MONTHS_LONG[d.getMonth()]}`;
}

// Numérotation TheSportsDB (vérifiée sur 2018/2022) : poule = round 1/2/3 ;
// phase finale = 32 (16es), 16 (8es), 125 (quarts), 150 (demies), 160 (3e place), 200 (finale).
const KO_ROUND: Record<string, string> = {
  '32': '16es de finale',
  '16': '8es de finale',
  '125': 'Quarts de finale',
  '150': 'Demi-finales',
  '160': 'Match 3e place',
  '200': 'Finale',
};

// En-tête de section (la phase).
export function phaseHeading(round?: string): string {
  const r = Number(round);
  if (r >= 1 && r <= 3) return 'Phase de groupes';
  if (round && KO_ROUND[round]) return KO_ROUND[round];
  return 'Phase finale';
}

// Détail court pour le sous-titre d'une ligne (journée en poule, rien en phase finale).
export function roundDetail(round?: string): string {
  const r = Number(round);
  if (r >= 1 && r <= 3) return `Journée ${r}`;
  return '';
}
