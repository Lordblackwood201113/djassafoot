export type Competition = {
  slug: string;
  name: string; // nom complet (titre)
  short: string; // nom court (nav / liste)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logo: any; // résultat d'un require('*.png') (asset Metro)
  available: boolean;
};

// La Coupe du Monde est la seule active ; les autres mènent à l'écran « indisponible ».
export const COMPETITIONS: Competition[] = [
  {
    slug: 'world-cup',
    name: 'Coupe du Monde 2026',
    short: 'Coupe du Monde',
    logo: require('../../assets/leagues/worldcup.png'),
    available: true,
  },
  {
    slug: 'ucl',
    name: 'Ligue des Champions',
    short: 'Ligue des Champions',
    logo: require('../../assets/leagues/ucl.png'),
    available: false,
  },
  {
    slug: 'premier-league',
    name: 'Premier League',
    short: 'Premier League',
    logo: require('../../assets/leagues/premierleague.png'),
    available: false,
  },
  {
    slug: 'la-liga',
    name: 'La Liga',
    short: 'La Liga',
    logo: require('../../assets/leagues/laliga.png'),
    available: false,
  },
  {
    slug: 'serie-a',
    name: 'Serie A',
    short: 'Serie A',
    logo: require('../../assets/leagues/seriea.png'),
    available: false,
  },
  {
    slug: 'ligue-1',
    name: 'Ligue 1',
    short: 'Ligue 1',
    logo: require('../../assets/leagues/ligue1.png'),
    available: false,
  },
  {
    slug: 'bundesliga',
    name: 'Bundesliga',
    short: 'Bundesliga',
    logo: require('../../assets/leagues/bundesliga.png'),
    available: false,
  },
  {
    slug: 'europa-league',
    name: 'Ligue Europa',
    short: 'Ligue Europa',
    logo: require('../../assets/leagues/uel.png'),
    available: false,
  },
];

export const WORLD_CUP = COMPETITIONS[0];

export function compBySlug(slug?: string): Competition | undefined {
  return COMPETITIONS.find((c) => c.slug === slug);
}
