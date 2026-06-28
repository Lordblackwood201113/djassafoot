import type { Doc } from '@convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatDayLong, formatTime, roundDetail } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';

import { Badge } from './Badge';

// Ligne de match (design Pencil « Score Row ») : nom+drapeau · heure/score · drapeau+nom.
export function MatchRow({ match }: { match: Doc<'matches'> }) {
  const router = useRouter();
  const live = match.status === 'live';
  const finished = match.status === 'finished';
  const showScore = live || finished;

  return (
    <Pressable onPress={() => router.push(`/match/${match._id}`)} className="px-4 pt-3">
      <Text className="text-center font-ui text-xs text-muted">
        {formatDayLong(match.kickoff)}
        {roundDetail(match.round) ? ` · ${roundDetail(match.round)}` : ''}
      </Text>

      <View className="mt-1.5 flex-row items-center">
        <View className="flex-1 flex-row items-center justify-end gap-2.5">
          <Text numberOfLines={1} className="shrink font-ui-medium text-[15px] text-white">
            {frTeam(match.homeName)}
          </Text>
          <Badge url={match.homeBadgeUrl} size={28} />
        </View>

        <View className="w-[92px] items-center gap-0.5">
          {showScore ? (
            <>
              <Text className="font-display-bold text-[17px] text-white">
                {match.homeScore ?? 0} - {match.awayScore ?? 0}
              </Text>
              <Text className={`font-ui text-[11px] ${live ? 'text-red' : 'text-muted'}`}>
                {live ? (match.minute ? `${match.minute}'` : 'Live') : 'Terminé'}
              </Text>
            </>
          ) : (
            <Text className="font-display-bold text-[17px] text-white">
              {formatTime(match.kickoff)}
            </Text>
          )}
        </View>

        <View className="flex-1 flex-row items-center gap-2.5">
          <Badge url={match.awayBadgeUrl} size={28} />
          <Text numberOfLines={1} className="shrink font-ui-medium text-[15px] text-white">
            {frTeam(match.awayName)}
          </Text>
        </View>
      </View>

      <View className="mt-3 h-px bg-white/[0.07]" />
    </Pressable>
  );
}
