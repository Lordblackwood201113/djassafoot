import { Text, View } from 'react-native';

// Séparateur brutaliste : traits épais + label mono.
export function Divider({ label = 'ou' }: { label?: string }) {
  return (
    <View className="w-full flex-row items-center gap-3">
      <View className="h-0.5 flex-1 bg-white/25" />
      <Text
        className="font-mono-bold text-[11px] uppercase text-muted"
        style={{ letterSpacing: 1 }}
      >
        {label}
      </Text>
      <View className="h-0.5 flex-1 bg-white/25" />
    </View>
  );
}
