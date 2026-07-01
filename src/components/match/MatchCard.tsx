import type { Doc } from '@convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Flag } from '@/components/brutal/Flag';
import { formatDay, formatTime } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';

export function MatchCard({ match }: { match: Doc<'matches'> }) {
  const router = useRouter();
  const live = match.status === 'live';
  const finished = match.status === 'finished';
  const showScore = live || finished;

  return (
    <Pressable
      onPress={() => router.push(`/match/${match._id}`)}
      className="w-full flex-row items-center px-4 py-3.5"
    >
      <View className="flex-1 flex-row items-center gap-2.5">
        <View
          className="items-center justify-center border-2 border-white bg-white"
          style={{ width: 36, height: 36, borderRadius: 0 }}
        >
          <Flag name={match.homeName} size={24} />
        </View>
        <Text className="flex-1 font-mono-bold text-[12px] uppercase text-white" numberOfLines={1}>
          {frTeam(match.homeName)}
        </Text>
      </View>

      <View
        className="items-center border-2 border-white bg-ink px-2 py-1"
        style={{ minWidth: 64, borderRadius: 0, marginHorizontal: 8 }}
      >
        {showScore ? (
          <>
            <Text className="font-display text-[16px] uppercase text-white">
              {match.homeScore ?? 0} - {match.awayScore ?? 0}
            </Text>
            <Text
              className={`font-mono text-[10px] uppercase ${live ? 'text-red' : 'text-muted'}`}
            >
              {live ? (match.minute ? `${match.minute}'` : 'LIVE') : 'TERMINÉ'}
            </Text>
          </>
        ) : (
          <>
            <Text className="font-display text-[16px] uppercase text-white">
              {formatTime(match.kickoff)}
            </Text>
            <Text className="font-mono text-[10px] uppercase text-muted">
              {formatDay(match.kickoff)}
            </Text>
          </>
        )}
      </View>

      <View className="flex-1 flex-row items-center justify-end gap-2.5">
        <Text
          className="flex-1 text-right font-mono-bold text-[12px] uppercase text-white"
          numberOfLines={1}
        >
          {frTeam(match.awayName)}
        </Text>
        <View
          className="items-center justify-center border-2 border-white bg-white"
          style={{ width: 36, height: 36, borderRadius: 0 }}
        >
          <Flag name={match.awayName} size={24} />
        </View>
      </View>
    </Pressable>
  );
}
