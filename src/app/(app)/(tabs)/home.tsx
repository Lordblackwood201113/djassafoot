import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { HeroMatch } from '@/components/match/HeroMatch';
import { MatchCard } from '@/components/match/MatchCard';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useStoreUser } from '@/hooks/useStoreUser';

export default function Home() {
  useStoreUser();
  const live = useQuery(api.matches.live);
  const upcoming = useQuery(api.matches.upcoming, { limit: 8 });

  const featured = (live && live.length > 0 ? live[0] : upcoming?.[0]) ?? null;
  const cards = (upcoming ?? []).filter((m) => m._id !== featured?._id).slice(0, 5);

  return (
    <ScreenBackground variant="app">
      <View className="flex-1">
        <AppHeader />
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 6,
            paddingBottom: 24,
            gap: 18,
          }}
          showsVerticalScrollIndicator={false}
        >
          {featured ? <HeroMatch match={featured} /> : null}

          <View className="flex-row items-center gap-2">
            <Ionicons name="flame" size={20} color="#E5342B" />
            <Text className="font-display-bold text-lg text-white">Matchs en vedette</Text>
          </View>

          <View className="gap-3.5">
            {cards.map((m) => (
              <MatchCard key={m._id} match={m} />
            ))}
          </View>

          {!featured && upcoming !== undefined ? (
            <Text className="mt-8 text-center font-ui text-sm text-muted">
              Aucun match à venir pour le moment.
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}
