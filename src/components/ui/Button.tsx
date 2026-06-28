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
      className={`w-full flex-row items-center justify-center rounded-2xl px-5 py-4 ${
        isPrimary ? 'bg-red' : 'border border-white/15 bg-white/5'
      } ${off ? 'opacity-60' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <Text className="font-ui-bold text-base text-white">{label}</Text>
      )}
    </Pressable>
  );
}
