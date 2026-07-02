import { Text, View } from 'react-native';

// Séparateur « Noir » : fines lignes hairline + label discret.
export function Divider({ label = 'ou' }: { label?: string }) {
  return (
    <View className="w-full flex-row items-center gap-3">
      <View className="h-px flex-1 bg-line" />
      <Text className="font-ui-medium text-[11px] text-muted">{label}</Text>
      <View className="h-px flex-1 bg-line" />
    </View>
  );
}
