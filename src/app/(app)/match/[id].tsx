import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FlameBalance } from '@/components/FlameBalance';
import { Badge } from '@/components/match/Badge';
import { ScreenBackground } from '@/components/ScreenBackground';
import { Button } from '@/components/ui/Button';
import { LOGO } from '@/lib/assets';
import { COMP_NAME, formatHeroDate } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const match = useQuery(api.matches.byId, id ? { id: id as Id<'matches'> } : 'skip');
  const myBets = useQuery(api.bets.forMatch, id ? { matchId: id as Id<'matches'> } : 'skip');
  const [now] = useState(() => Date.now());

  return (
    <ScreenBackground variant="app">
      <View className="flex-1 pt-14">
        <View className="flex-row items-center justify-between px-4 pt-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
            className="h-9 w-9 items-center justify-center"
          >
            <Ionicons name="chevron-back" size={26} color="#ffffff" />
          </Pressable>
          <Image
            source={LOGO}
            style={{ width: 120, height: 23 }}
            contentFit="contain"
            accessibilityLabel="Djassa Foot"
          />
          <FlameBalance />
        </View>

        {match ? (
          <View className="flex-1 items-center gap-4 px-6 pt-6">
            <Text className="font-ui-medium text-xs text-muted">
              {COMP_NAME[match.competitionApiId] ?? 'Coupe du Monde'}
            </Text>

            <View className="flex-row items-center justify-center gap-6">
              <Badge url={match.homeBadgeUrl} size={68} />
              {match.status === 'scheduled' ? (
                <Text className="font-display text-xl text-muted">VS</Text>
              ) : (
                <Text className="font-display text-3xl text-white">
                  {match.homeScore ?? 0} - {match.awayScore ?? 0}
                </Text>
              )}
              <Badge url={match.awayBadgeUrl} size={68} />
            </View>

            <Text className="text-center font-display text-2xl text-white">
              {frTeam(match.homeName)} — {frTeam(match.awayName)}
            </Text>
            <Text className="font-ui text-sm text-muted">
              {match.status === 'live'
                ? `${match.minute ? `${match.minute}' · ` : ''}En cours`
                : match.status === 'finished'
                  ? 'Terminé'
                  : formatHeroDate(match.kickoff)}
            </Text>

            {match.status === 'scheduled' && match.kickoff > now ? (
              <View className="mt-6 w-full gap-2">
                <Button
                  label={myBets && myBets.length > 0 ? 'Ajouter un prono' : 'Pronostiquer'}
                  onPress={() => router.push(`/prono/${match._id}`)}
                />
                {myBets && myBets.length > 0 ? (
                  <Text className="text-center font-ui text-xs text-muted">
                    Tu as déjà {myBets.length} pari{myBets.length > 1 ? 's' : ''} sur ce match.
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text className="mt-6 font-ui-medium text-sm text-muted">Pronos fermés pour ce match.</Text>
            )}
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="font-ui text-sm text-muted">Chargement…</Text>
          </View>
        )}
      </View>
    </ScreenBackground>
  );
}
