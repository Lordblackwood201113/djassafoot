import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { BrutalSegment } from '@/components/brutal/Segment';
import { BetCard, type Bet } from '@/components/prono/BetCard';
import { ScreenBackground } from '@/components/ScreenBackground';

export default function Pronos() {
  const router = useRouter();
  const bets = useQuery(api.bets.mine) as Bet[] | undefined;
  const [tab, setTab] = useState<'live' | 'done'>('live');

  const filtered = (bets ?? []).filter((b) =>
    tab === 'live' ? b.status === 'pending' : b.status !== 'pending',
  );

  return (
    <ScreenBackground variant="app">
      <View className="flex-1">
        <AppHeader />

        <View className="flex-row items-center gap-2 px-5 pb-3 pt-1">
          <View className="h-2.5 w-2.5 bg-red" style={{ borderRadius: 0 }} />
          <Text className="font-display text-2xl uppercase text-white">Mes pronos</Text>
        </View>

        <View className="mx-5 mb-4">
          <BrutalSegment
            options={[
              { key: 'live', label: 'EN COURS' },
              { key: 'done', label: 'TERMINÉS' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        {bets === undefined ? (
          <Text className="mt-16 text-center font-mono uppercase text-sm text-muted">Chargement…</Text>
        ) : filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-4xl">🪙</Text>
            <Text className="mt-3 text-center font-display text-base uppercase text-white">
              {tab === 'live' ? 'Aucun prono en cours' : 'Aucun prono terminé'}
            </Text>
            <Text className="mt-1.5 text-center font-mono text-xs uppercase text-muted">
              Va sur un match et tente ta chance !
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {filtered.map((b) => (
              <Pressable key={b._id} onPress={() => router.push(`/bet/${b._id}`)}>
                <BetCard bet={b} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </ScreenBackground>
  );
}
