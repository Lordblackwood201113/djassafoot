import { ActivityIndicator, Pressable, Text } from 'react-native';

import { hardShadow } from '@/lib/brutal';

type Variant = 'primary' | 'light' | 'green' | 'ghost';

const V: Record<Variant, { bg: string; fg: string; shadow: string; border?: string }> = {
  primary: { bg: '#E5342B', fg: '#FFFFFF', shadow: '#0A1230' },
  light: { bg: '#FFFFFF', fg: '#0A1230', shadow: '#E5342B' },
  green: { bg: '#3FCB86', fg: '#0A1230', shadow: '#E5342B' },
  ghost: { bg: '#0A1230', fg: '#9AA4CC', shadow: '', border: '#FFFFFF' },
};

// Bouton brutaliste : angles vifs, ombre dure, label Sora majuscule.
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
  // `disabled` explicite = état grisé ; `loading` garde la couleur + l'ombre (spinner).
  const isDisabled = !!disabled && !loading;
  const showShadow = v.shadow && !isDisabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: isDisabled ? '#232F66' : v.bg,
          borderRadius: 0,
          paddingVertical: 15,
          paddingHorizontal: full ? 0 : 20,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: full ? 'stretch' : 'flex-start',
          borderWidth: v.border ? 2 : 0,
          borderColor: v.border,
        },
        showShadow ? hardShadow(v.shadow, 4) : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <Text
          className="font-display text-[15px] uppercase"
          style={{ color: isDisabled ? '#9AA4CC' : v.fg, letterSpacing: 0.5 }}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
