// Codes TheSportsDB (`intRound`) des tours à élimination directe de la CdM 2026.
// 32=16es, 16=8es, 125=quarts, 150=demies, 200=finale (et petite finale).
// Partagé entre l'ingestion (enrichissement API-Football) et le règlement des paris.
export const KO_ROUNDS = ['32', '16', '125', '150', '200'];

export function isKnockoutRound(round?: string): boolean {
  return KO_ROUNDS.includes(round ?? '');
}
