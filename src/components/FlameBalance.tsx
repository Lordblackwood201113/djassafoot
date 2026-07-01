import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { Text, View } from 'react-native';

// Solde de jetons 🪙 (réactif). Nom de fichier conservé (FlameBalance) pour ne rien casser.
export function FlameBalance() {
  const me = useQuery(api.users.current);
  return (
    <View className="flex-row items-center gap-1.5 rounded-2xl bg-surface px-3 py-1.5">
      <Text style={{ fontSize: 14 }}>🪙</Text>
      <Text className="font-display-bold text-sm text-white">
        {me ? me.flames.toLocaleString('fr-FR') : '—'}
      </Text>
    </View>
  );
}
