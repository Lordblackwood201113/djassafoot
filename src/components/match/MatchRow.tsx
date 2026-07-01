import type { Doc } from '@convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Flag } from '@/components/brutal/Flag';
import { formatDayLong, formatTime, roundDetail } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';

// Ligne de match brutaliste : [drapeau nom] · heure/score · [nom drapeau] en mono, filet épais en bas.
export function MatchRow({ match }: { match: Doc<'matches'> }) {
  const router = useRouter();
  const live = match.status === 'live';
  const finished = match.status === 'finished';
  const showScore = live || finished;

  return (
    <Pressable
      onPress={() => router.push(`/match/${match._id}`)}
      className="border-b-2 border-white/20 px-4 py-3.5"
    >
      <Text className="text-center font-mono text-[10px] uppercase text-muted" style={{ letterSpacing: 0.5 }}>
        {formatDayLong(match.kickoff)}
        {roundDetail(match.round) ? ` · ${roundDetail(match.round)}` : ''}
      </Text>

      <View className="mt-2 flex-row items-center">
        <View className="flex-1 flex-row items-center justify-end gap-2.5">
          <Text
            numberOfLines={1}
            className="shrink font-mono-bold text-[14px] uppercase text-white"
          >
            {frTeam(match.homeName)}
          </Text>
          <Flag name={match.homeName} size={26} />
        </View>

        <View className="w-[92px] items-center gap-1">
          {showScore ? (
            <>
              <Text className="font-display text-[20px] text-white">
                {match.homeScore ?? 0}-{match.awayScore ?? 0}
              </Text>
              <View
                className={live ? 'bg-red px-1.5 py-0.5' : undefined}
                style={{ borderRadius: 0 }}
              >
                <Text
                  className={`font-mono-bold text-[10px] uppercase ${live ? 'text-white' : 'text-muted'}`}
                  style={{ letterSpacing: 0.5 }}
                >
                  {live ? (match.minute ? `${match.minute}'` : 'LIVE') : 'TERMINÉ'}
                </Text>
              </View>
            </>
          ) : (
            <Text className="font-display text-[20px] text-white">
              {formatTime(match.kickoff)}
            </Text>
          )}
        </View>

        <View className="flex-1 flex-row items-center gap-2.5">
          <Flag name={match.awayName} size={26} />
          <Text
            numberOfLines={1}
            className="shrink font-mono-bold text-[14px] uppercase text-white"
          >
            {frTeam(match.awayName)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
