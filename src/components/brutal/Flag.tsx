import { Image } from 'expo-image';
import { View } from 'react-native';

import { flagUrl } from '@/lib/flags';

// Drapeau national (via TheSportsDB) rendu dans un carré ; fallback bloc neutre.
export function Flag({ name, size = 26 }: { name?: string | null; size?: number }) {
  const url = flagUrl(name);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} contentFit="contain" />
      ) : (
        <View style={{ width: size, height: size, borderRadius: 8, backgroundColor: '#1C1C20' }} />
      )}
    </View>
  );
}
