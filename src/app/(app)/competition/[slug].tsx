import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { ScreenBackground } from '@/components/ScreenBackground';
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
            className="h-9 w-9 items-center justify-center rounded-2xl bg-surface"
          >
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center gap-4 px-9">
          <View className="h-[130px] w-[130px] items-center justify-center">
            <Image
              source={comp.logo}
              style={{ width: 100, height: 100, opacity: 0.6 }}
              contentFit="contain"
            />
            <View className="absolute bottom-1 right-1 h-[42px] w-[42px] items-center justify-center rounded-full border-[3px] border-blue-mid bg-surface-2">
              <Ionicons name="lock-closed" size={18} color="#9AA4CC" />
            </View>
          </View>

          <View className="rounded-xl bg-surface-2 px-3 py-1.5">
            <Text className="font-ui-semibold text-xs text-muted">HORS SAISON</Text>
          </View>

          <Text className="text-center font-display text-2xl text-white">{comp.short}</Text>
          <Text
            className="text-center font-ui text-[15px] text-muted"
            style={{ lineHeight: 22 }}
          >
            Cette compétition n&apos;est pas encore disponible pour les pronos. On se concentre sur la
            Coupe du Monde 2026 pour le moment !
          </Text>
        </View>

        <View className="gap-2.5 px-6 pb-10">
          <Pressable className="flex-row items-center justify-center gap-2 rounded-full bg-surface py-4">
            <Ionicons name="notifications-outline" size={18} color="#ffffff" />
            <Text className="font-ui-semibold text-base text-white">Me prévenir au lancement</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/matches')}
            className="flex-row items-center justify-center gap-2 rounded-full bg-red py-4"
          >
            <Image source={WORLD_CUP.logo} style={{ width: 20, height: 20 }} contentFit="contain" />
            <Text className="font-ui-bold text-base text-white">Voir la Coupe du Monde 2026</Text>
          </Pressable>
        </View>
      </View>
    </ScreenBackground>
  );
}
