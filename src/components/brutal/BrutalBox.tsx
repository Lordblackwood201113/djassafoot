import { View, type ViewProps } from 'react-native';

import { hardShadow } from '@/lib/brutal';

// Bloc brutaliste : angles vifs + bordure épaisse + ombre dure décalée.
// Le fond / padding se pilotent via `className` (ex. "bg-surface-3 p-4").
type Props = ViewProps & {
  shadow?: string | false; // couleur d'ombre dure, ou false pour aucune
  offset?: number;
  border?: string;
  borderWidth?: number;
};

export function BrutalBox({
  shadow = '#E5342B',
  offset = 5,
  border = '#FFFFFF',
  borderWidth = 2,
  style,
  children,
  ...rest
}: Props) {
  return (
    <View
      style={[
        { borderWidth, borderColor: border, borderRadius: 0 },
        shadow ? hardShadow(shadow, offset) : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
