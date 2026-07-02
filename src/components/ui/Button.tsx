import { ActivityIndicator, Pressable, Text } from 'react-native';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
}: Props) {
  const isPrimary = variant === 'primary';
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      className={`w-full flex-row items-center justify-center rounded-xl px-5 py-4 ${
        isPrimary ? 'bg-paper' : 'border border-hairline bg-white/5'
      } ${off ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#0A0A0B' : '#ffffff'} />
      ) : (
        <Text
          className={`font-ui-semibold text-base ${isPrimary ? 'text-ink' : 'text-white'}`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
