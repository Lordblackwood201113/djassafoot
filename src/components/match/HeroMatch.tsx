import type { Doc } from '@convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { Flag } from '@/components/brutal/Flag';
import { formatHeroDate } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';

export function HeroMatch({ match }: { match: Doc<'matches'> }) {
  const router = useRouter();
  const live = match.status === 'live';

  return (
    <BrutalBox shadow={false} borderWidth={1} className="rounded-2xl bg-card p-4">
      <View className="flex-row items-center gap-2">
        {live ? (
          <View className="flex-row items-center gap-1.5 rounded-full bg-red px-2 py-0.5">
            <View className="h-1.5 w-1.5 rounded-full bg-white" />
            <Text className="font-ui-semibold text-[11px] text-white" style={{ letterSpacing: 0.5 }}>
              Coupe du Monde · En direct
            </Text>
          </View>
        ) : (
          <Text className="font-ui-semibold text-[11px] text-muted" style={{ letterSpacing: 0.5 }}>
            Coupe du Monde · À la une
          </Text>
        )}
      </View>

      <View className="mt-5 flex-row items-center justify-between">
        <View className="items-center gap-2.5" style={{ width: 100 }}>
          <View
            className="items-center justify-center rounded-2xl bg-surface-2"
            style={{ width: 60, height: 60 }}
          >
            <Flag name={match.homeName} size={42} />
          </View>
          <Text
            className="text-center font-ui-semibold text-[11px] text-white"
            numberOfLines={2}
          >
            {frTeam(match.homeName)}
          </Text>
        </View>

        {live ? (
          <View className="items-center justify-center rounded-xl border border-hairline bg-surface-2 px-3 py-2">
            <Text className="font-display text-3xl text-white">
              {match.homeScore ?? 0} - {match.awayScore ?? 0}
            </Text>
          </View>
        ) : (
          <View className="items-center justify-center rounded-xl bg-surface-2 px-4 py-2">
            <Text className="font-display text-2xl text-muted">VS</Text>
          </View>
        )}

        <View className="items-center gap-2.5" style={{ width: 100 }}>
          <View
            className="items-center justify-center rounded-2xl bg-surface-2"
            style={{ width: 60, height: 60 }}
          >
            <Flag name={match.awayName} size={42} />
          </View>
          <Text
            className="text-center font-ui-semibold text-[11px] text-white"
            numberOfLines={2}
          >
            {frTeam(match.awayName)}
          </Text>
        </View>
      </View>

      <View className="mt-5 h-px bg-line" />
      <Text className="mt-3 text-center font-ui-medium text-[12px] text-muted">
        {live
          ? match.minute
            ? `${match.minute}' en cours`
            : 'En cours'
          : formatHeroDate(match.kickoff)}
      </Text>

      <View className="mt-4">
        <BrutalButton
          label="Pronostiquer"
          variant="primary"
          onPress={() => router.push(`/match/${match._id}`)}
        />
      </View>
    </BrutalBox>
  );
}
