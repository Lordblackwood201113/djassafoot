import { Image } from 'expo-image';
import { View } from 'react-native';

import { FlameBalance } from '@/components/FlameBalance';
import { LOGO } from '@/lib/assets';

// Barre de marque persistante : logo (gauche) + solde de flammes (droite).
export function AppHeader() {
  return (
    <View className="flex-row items-center justify-between px-5 pb-2.5 pt-[39px]">
      <Image
        source={LOGO}
        style={{ width: 132, height: 25 }}
        contentFit="contain"
        accessibilityLabel="Djassa Foot"
      />
      <FlameBalance />
    </View>
  );
}
