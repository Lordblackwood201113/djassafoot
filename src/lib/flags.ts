// Drapeau national via TheSportsDB (fichiers en tirets + alias pour quelques noms).
// Les drapeaux nationaux sont dans le domaine public.
const ALIAS: Record<string, string> = {
  'Korea Republic': 'South-Korea',
  'Bosnia-Herzegovina': 'Bosnia-and-Herzegovina',
  Curaçao: 'Curacao',
};

export function flagUrl(name?: string | null, size: 32 | 64 = 64): string | undefined {
  if (!name) return undefined;
  const file = (ALIAS[name] ?? name).replace(/'/g, '').replace(/\s+/g, '-');
  return `https://www.thesportsdb.com/images/icons/flags/shiny/${size}/${encodeURIComponent(file)}.png`;
}
