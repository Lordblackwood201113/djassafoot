// Grille officielle de la phase finale CdM 2026 (FIFA, pré-déterminée).
// Les 16es sont ordonnés DE HAUT EN BAS pour que l'arbre s'aligne : chaque paire adjacente
// alimente le même 8e (W74/W77→M89, W73/W75→M90, …). Codes : « 1E » = 1er groupe E,
// « 2C » = 2e groupe C, « 3A/B/C/D/F » = un des meilleurs 3es (poule indéterminée).
export type R32Slot = { a: string; b: string };

export const R32: R32Slot[] = [
  { a: '1E', b: '3A/B/C/D/F' }, // M74
  { a: '1I', b: '3C/D/F/G/H' }, // M77
  { a: '2A', b: '2B' }, // M73
  { a: '1F', b: '2C' }, // M75
  { a: '2K', b: '2L' }, // M83
  { a: '1H', b: '2J' }, // M84
  { a: '1D', b: '3B/E/F/I/J' }, // M81
  { a: '1G', b: '3A/E/H/I/J' }, // M82
  { a: '1C', b: '2F' }, // M76
  { a: '2E', b: '2I' }, // M78
  { a: '1A', b: '3C/E/F/H/I' }, // M79
  { a: '1L', b: '3E/H/I/J/K' }, // M80
  { a: '1J', b: '2H' }, // M86
  { a: '2D', b: '2G' }, // M88
  { a: '1B', b: '3E/F/G/I/J' }, // M85
  { a: '1K', b: '3D/E/I/J/L' }, // M87
];
