import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { Fragment } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { BrutalBox } from '@/components/brutal/BrutalBox';
import { HeroMatch } from '@/components/match/HeroMatch';
import { MatchCard } from '@/components/match/MatchCard';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useStoreUser } from '@/hooks/useStoreUser';

function SectionLabel({ title }: { title: string }) {
  return (
    <Text className="font-display text-lg text-white">{title}</Text>
  );
}

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
          {featured ? (
            <View className="gap-3">
              <SectionLabel title="À la une" />
              <HeroMatch match={featured} />
            </View>
          ) : null}

          {cards.length > 0 ? (
            <View className="gap-3">
              <SectionLabel title="Prochains matchs" />
              <BrutalBox className="bg-card">
                {cards.map((m, i) => (
                  <Fragment key={m._id}>
                    {i > 0 ? <View className="h-px bg-line" /> : null}
                    <MatchCard match={m} />
                  </Fragment>
                ))}
              </BrutalBox>
            </View>
          ) : null}

          {!featured && upcoming !== undefined ? (
            <Text className="mt-8 text-center font-ui-medium text-sm text-muted">
              Aucun match à venir pour le moment.
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}
