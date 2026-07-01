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
    <View className="gap-1.5">
      <View className="flex-row items-center gap-2.5">
        <View style={{ width: 10, height: 10 }} className="bg-red" />
        <Text className="font-display text-lg uppercase text-white" style={{ letterSpacing: 0.5 }}>
          {title}
        </Text>
      </View>
      <View style={{ height: 3, width: 44, backgroundColor: '#E5342B' }} />
    </View>
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
              <SectionLabel title="À LA UNE" />
              <HeroMatch match={featured} />
            </View>
          ) : null}

          {cards.length > 0 ? (
            <View className="gap-3">
              <SectionLabel title="PROCHAINS MATCHS" />
              <BrutalBox shadow="#0A1230" offset={5} borderWidth={2} className="bg-surface-3">
                {cards.map((m, i) => (
                  <Fragment key={m._id}>
                    {i > 0 ? (
                      <View style={{ height: 2, backgroundColor: '#FFFFFF' }} />
                    ) : null}
                    <MatchCard match={m} />
                  </Fragment>
                ))}
              </BrutalBox>
            </View>
          ) : null}

          {!featured && upcoming !== undefined ? (
            <Text className="mt-8 text-center font-mono text-sm uppercase text-muted">
              AUCUN MATCH À VENIR POUR LE MOMENT.
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}
