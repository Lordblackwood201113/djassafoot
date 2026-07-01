import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { ScreenBackground } from '@/components/ScreenBackground';
import { hardShadow } from '@/lib/brutal';
import { compBySlug, WORLD_CUP } from '@/lib/competitions';

export default function CompetitionUnavailable() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const comp = compBySlug(slug) ?? WORLD_CUP;

  return (
    <ScreenBackground variant="app">
      <View className="flex-1 pt-12">
        <View className="px-5">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
            className="h-10 w-10 items-center justify-center border-2 border-white bg-ink"
            style={hardShadow('#E5342B', 4)}
          >
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center gap-6 px-9">
          <BrutalBox shadow="#E5342B" offset={6} borderWidth={2} className="bg-surface-3 p-6">
            <View className="h-[120px] w-[120px] items-center justify-center">
              <Image
                source={comp.logo}
                style={{ width: 100, height: 100, opacity: 0.45 }}
                contentFit="contain"
              />
              <View
                className="absolute bottom-0 right-0 h-[40px] w-[40px] items-center justify-center border-2 border-white bg-ink"
                style={hardShadow('#E5342B', 3)}
              >
                <Ionicons name="lock-closed" size={18} color="#9AA4CC" />
              </View>
            </View>
          </BrutalBox>

          <View className="border-2 border-red bg-ink px-4 py-2" style={hardShadow('#E5342B', 3)}>
            <Text className="font-mono-bold text-xs uppercase text-red" style={{ letterSpacing: 1 }}>
              HORS SAISON
            </Text>
          </View>

          <Text
            className="text-center font-display text-3xl uppercase text-white"
            style={{ letterSpacing: 0.5 }}
          >
            {comp.short}
          </Text>

          <View className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 bg-red" />
            <Text
              className="font-mono-bold text-[11px] uppercase text-muted"
              style={{ letterSpacing: 1 }}
            >
              Indisponible
            </Text>
          </View>

          <Text
            className="text-center font-mono text-[13px] uppercase text-muted"
            style={{ lineHeight: 22, letterSpacing: 0.3 }}
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
