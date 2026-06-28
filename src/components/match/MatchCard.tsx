import type { Doc } from '@convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { COMP_NAME, formatDay, formatTime } from '@/lib/format';

import { Badge } from './Badge';

export function MatchCard({ match }: { match: Doc<'matches'> }) {
  const router = useRouter();
  const live = match.status === 'live';
  const finished = match.status === 'finished';
  const showScore = live || finished;

  return (
    <Pressable
      onPress={() => router.push(`/match/${match._id}`)}
      className="w-full rounded-[18px] bg-surface px-3.5 pb-4 pt-3.5"
    >
      <View className="items-center">
        <Text className="font-ui-medium text-xs text-muted">
          {COMP_NAME[match.competitionApiId] ?? 'Coupe du Monde'}
        </Text>
      </View>

      <View className="mt-3 flex-row items-center justify-between px-1.5">
        <Badge url={match.homeBadgeUrl} />

        <View className="items-center gap-0.5">
          {showScore ? (
            <>
              <Text className="font-display-bold text-lg text-white">
                {match.homeScore ?? 0} - {match.awayScore ?? 0}
              </Text>
              <Text className={`font-ui text-[11px] ${live ? 'text-red' : 'text-muted'}`}>
                {live ? (match.minute ? `${match.minute}'` : 'Live') : 'Terminé'}
              </Text>
            </>
          ) : (
            <>
              <Text className="font-display-bold text-lg text-white">
                {formatTime(match.kickoff)}
              </Text>
              <Text className="font-ui text-[11px] text-muted">{formatDay(match.kickoff)}</Text>
            </>
          )}
        </View>

        <Badge url={match.awayBadgeUrl} />
      </View>
    </Pressable>
  );
}
