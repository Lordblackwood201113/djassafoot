import type { ViewStyle } from 'react-native';

// Thème « Noir » : design PLAT (profondeur via contraste de surfaces + filets hairline).
// `hardShadow` est conservé pour compat (appelé dans de nombreux écrans) mais ne rend plus
// aucune ombre — les anciens arguments (couleur/décalage) sont ignorés.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function hardShadow(_color = '#000', _d = 5): ViewStyle {
  return {};
}

// Ombre douce optionnelle (élévation moderne, sans décalage dur) — à utiliser explicitement.
export function softShadow(): ViewStyle {
  return {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  };
}

// Palette « Noir » (mêmes valeurs que les tokens Tailwind).
export const B = {
  bg: '#0A0A0B',
  card: '#151518',
  surface2: '#1C1C20',
  surface3: '#151518',
  hairline: 'rgba(255,255,255,0.10)',
  line: 'rgba(255,255,255,0.06)',
  white: '#FFFFFF',
  paper: '#F5F5F4',
  muted: '#A1A1AA',
  mutedDark: '#6B7280',
  green: '#6FA287', // sauge
  red: '#E5484D', // désaturé
  gold: '#D9C48A',
  silver: '#B8BCC4',
  bronze: '#B98A63',
} as const;
