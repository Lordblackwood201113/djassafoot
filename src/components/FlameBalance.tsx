import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { Text, View } from 'react-native';

export function FlameBalance() {
  const me = useQuery(api.users.current);
  return (
    <View className="flex-row items-center gap-1.5 rounded-2xl bg-surface px-3 py-1.5">
      <Ionicons name="flame" size={16} color="#E5342B" />
      <Text className="font-display-bold text-sm text-white">
        {me ? me.flames.toLocaleString('fr-FR') : '—'}
      </Text>
    </View>
  );
}
