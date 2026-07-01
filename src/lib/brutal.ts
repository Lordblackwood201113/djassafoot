import type { ViewStyle } from 'react-native';

// Ombre DURE décalée (sans flou) — signature brutaliste (shadowRadius 0 = arête nette).
// Sur web (RN Web) → boxShadow net ; sur natif → shadow* / elevation.
export function hardShadow(color = '#E5342B', d = 5): ViewStyle {
  return {
    shadowColor: color,
    shadowOffset: { width: d, height: d },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  };
}

// Palette brutaliste (mêmes valeurs que les tokens Tailwind).
export const B = {
  red: '#E5342B',
  green: '#3FCB86',
  ink: '#0A1230',
  surface3: '#131C3F',
  white: '#FFFFFF',
  muted: '#9AA4CC',
  mutedDark: '#6B76A8',
  gold: '#FFD24A',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
} as const;
