import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

/**
 * Fond dégradé OFFICIEL extrait de djassa.pen (linéaire vertical, rotation 180° → clair en haut, foncé en bas).
 * - `app`  : écrans de contenu (Home, Match Detail…)  →  blue-mid → blue-bottom
 * - `hero` : écrans d'accroche (Splash, Welcome, Auth) →  blue-top → blue-mid → blue-bottom
 */
// - `app`     : contenu (Home…)        → blue-mid → blue-bottom
// - `hero`    : accroche (Welcome/Auth) → blue-top → blue-mid → blue-bottom
// - `success` : validation/code          → vert → blue-bottom (comme « Prono Result »)
type Variant = 'app' | 'hero' | 'success';

const GRADIENTS = {
  app: { colors: ['#16215C', '#0A1230'] as const, locations: [0, 1] as const },
  hero: { colors: ['#2C40A0', '#16215C', '#0A1230'] as const, locations: [0, 0.55, 1] as const },
  success: { colors: ['#0F5C3E', '#0A1230'] as const, locations: [0, 0.6] as const },
};

export function ScreenBackground({
  variant = 'app',
  children,
}: {
  variant?: Variant;
  children?: ReactNode;
}) {
  const g = GRADIENTS[variant];
  return (
    <LinearGradient
      colors={g.colors}
      locations={g.locations}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      {children}
    </LinearGradient>
  );
}
