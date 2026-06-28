import { Text, View } from 'react-native';

export function Divider({ label = 'ou' }: { label?: string }) {
  return (
    <View className="w-full flex-row items-center gap-3">
      <View className="h-px flex-1 bg-white/10" />
      <Text className="font-ui text-xs uppercase text-muted">{label}</Text>
      <View className="h-px flex-1 bg-white/10" />
    </View>
  );
}
