import { View, type ViewProps } from 'react-native';

// Carte « Noir » : coins arrondis + fine bordure hairline, à plat (pas d'ombre dure).
// Le fond / padding se pilotent via `className` (ex. "bg-surface-3 p-4").
// Les anciennes props brutalistes (shadow/offset/border/borderWidth) sont acceptées pour
// compatibilité mais n'ont plus d'effet dur ; `radius` permet d'ajuster l'arrondi.
type Props = ViewProps & {
  shadow?: string | false;
  offset?: number;
  border?: string;
  borderWidth?: number;
  radius?: number;
};

export function BrutalBox({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  shadow,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  offset,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  borderWidth,
  border = 'rgba(255,255,255,0.10)',
  radius = 16,
  style,
  children,
  ...rest
}: Props) {
  return (
    <View
      style={[{ borderRadius: radius, borderWidth: 1, borderColor: border }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}
