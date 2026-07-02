import { ActivityIndicator, Pressable, Text } from 'react-native';

type Variant = 'primary' | 'light' | 'green' | 'ghost';

// Thème « Noir » : bouton plein blanc (texte noir) pour l'action principale, ghost = contour
// hairline. Coins arrondis, casse normale, pas d'ombre dure.
const V: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: '#F5F5F4', fg: '#0A0A0B' },
  light: { bg: '#F5F5F4', fg: '#0A0A0B' },
  green: { bg: '#6FA287', fg: '#0A0A0B' },
  ghost: { bg: 'transparent', fg: '#F5F5F4', border: 'rgba(255,255,255,0.16)' },
};

export function BrutalButton({
  label,
  variant = 'primary',
  onPress,
  disabled,
  loading = false,
  full = true,
}: {
  label: string;
  variant?: Variant;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
}) {
  const v = V[variant];
  const isDisabled = !!disabled && !loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: isDisabled ? '#1C1C20' : v.bg,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: full ? 0 : 22,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: full ? 'stretch' : 'flex-start',
        borderWidth: v.border ? 1 : 0,
        borderColor: v.border,
      }}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text className="font-display-bold text-[15px]" style={{ color: isDisabled ? '#6B7280' : v.fg }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
