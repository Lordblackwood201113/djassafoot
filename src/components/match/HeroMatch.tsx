import type { Doc } from '@convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { Flag } from '@/components/brutal/Flag';
import { hardShadow } from '@/lib/brutal';
import { formatHeroDate } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';

export function HeroMatch({ match }: { match: Doc<'matches'> }) {
  const router = useRouter();
  const live = match.status === 'live';

  return (
    <BrutalBox shadow="#E5342B" offset={6} borderWidth={2} className="bg-surface-3 p-4">
      <View className="flex-row items-center gap-2">
        <View style={{ width: 8, height: 8 }} className="bg-red" />
        <Text
          className="font-mono-bold text-[11px] uppercase text-red"
          style={{ letterSpacing: 1.5 }}
        >
          {live ? 'COUPE DU MONDE · EN DIRECT' : 'COUPE DU MONDE · À LA UNE'}
        </Text>
      </View>

      <View className="mt-5 flex-row items-center justify-between">
        <View className="items-center gap-2.5" style={{ width: 100 }}>
          <View
            className="items-center justify-center border-2 border-white bg-white"
            style={{ width: 60, height: 60, borderRadius: 0, ...hardShadow('#0A1230', 4) }}
          >
            <Flag name={match.homeName} size={42} />
          </View>
          <Text
            className="text-center font-mono-bold text-[11px] uppercase text-white"
            numberOfLines={2}
          >
            {frTeam(match.homeName)}
          </Text>
        </View>

        {live ? (
          <View
            className="items-center justify-center border-2 border-white bg-ink px-3 py-2"
            style={{ borderRadius: 0, ...hardShadow('#E5342B', 4) }}
          >
            <Text className="font-display text-3xl uppercase text-white">
              {match.homeScore ?? 0} - {match.awayScore ?? 0}
            </Text>
          </View>
        ) : (
          <View
            className="items-center justify-center bg-red px-4 py-2"
            style={{ borderRadius: 0, ...hardShadow('#0A1230', 4) }}
          >
            <Text className="font-display text-2xl uppercase text-white">VS</Text>
          </View>
        )}

        <View className="items-center gap-2.5" style={{ width: 100 }}>
          <View
            className="items-center justify-center border-2 border-white bg-white"
            style={{ width: 60, height: 60, borderRadius: 0, ...hardShadow('#0A1230', 4) }}
          >
            <Flag name={match.awayName} size={42} />
          </View>
          <Text
            className="text-center font-mono-bold text-[11px] uppercase text-white"
            numberOfLines={2}
          >
            {frTeam(match.awayName)}
          </Text>
        </View>
      </View>

      <View style={{ height: 2, backgroundColor: '#FFFFFF' }} className="mt-5" />
      <Text className="mt-3 text-center font-mono text-[12px] uppercase text-muted">
        {live
          ? match.minute
            ? `${match.minute}' EN COURS`
            : 'EN COURS'
          : formatHeroDate(match.kickoff)}
      </Text>

      <View className="mt-4">
        <BrutalButton
          label="PRONOSTIQUER"
          variant="primary"
          onPress={() => router.push(`/match/${match._id}`)}
        />
      </View>
    </BrutalBox>
  );
}
