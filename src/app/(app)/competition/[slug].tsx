import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { ScreenBackground } from '@/components/ScreenBackground';
import { compBySlug, WORLD_CUP } from '@/lib/competitions';

export default function CompetitionUnavailable() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const comp = compBySlug(slug) ?? WORLD_CUP;

  return (
    <ScreenBackground variant="app">
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="px-5">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
            className="h-10 w-10 items-center justify-center rounded-[13px] border border-hairline bg-surface-2"
          >
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center gap-6 px-9">
          <BrutalBox className="bg-surface-3 p-6">
            <View className="h-[120px] w-[120px] items-center justify-center">
              <Image
                source={comp.logo}
                style={{ width: 100, height: 100, opacity: 0.45 }}
                contentFit="contain"
              />
              <View className="absolute bottom-0 right-0 h-[40px] w-[40px] items-center justify-center rounded-[13px] border border-hairline bg-surface-2">
                <Ionicons name="lock-closed" size={18} color="#A1A1AA" />
              </View>
            </View>
          </BrutalBox>

          <View className="rounded-full bg-surface-2 px-4 py-2">
            <Text className="font-ui-semibold text-xs text-muted">Hors saison</Text>
          </View>

          <Text className="text-center font-display text-3xl text-white">{comp.short}</Text>

          <View className="flex-row items-center gap-2">
            <Text className="font-ui-semibold text-[11px] text-muted">Indisponible</Text>
          </View>

          <Text
            className="text-center font-ui text-[13px] text-muted"
            style={{ lineHeight: 22 }}
          >
            Cette compétition n&apos;est pas encore disponible pour les pronos. On se concentre sur la
            Coupe du Monde 2026 pour le moment !
          </Text>
        </View>

        <View className="gap-3 px-6 pb-10">
          <BrutalButton label="Me prévenir au lancement" variant="ghost" />
          <BrutalButton
            label="Voir la Coupe du Monde 2026"
            variant="primary"
            onPress={() => router.replace('/matches')}
          />
        </View>
      </View>
    </ScreenBackground>
  );
}
