import type { ReactNode } from 'react';
import { View } from 'react-native';

// Thème « Noir » : fond uni noir profond (fini le dégradé bleu). La variante est conservée
// pour compat mais toutes rendent le même fond `#0A0A0B`.
type Variant = 'app' | 'hero' | 'success';

export function ScreenBackground({
  children,
}: {
  variant?: Variant;
  children?: ReactNode;
}) {
  return <View className="flex-1 bg-ink">{children}</View>;
}
