import type { Doc } from '@convex/_generated/dataModel';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { formatHeroDate } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';

import { Badge } from './Badge';

export function HeroMatch({ match }: { match: Doc<'matches'> }) {
  const router = useRouter();
  const live = match.status === 'live';

  return (
    <LinearGradient
      colors={['#2C40A0', '#3A1530']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ borderRadius: 22 }}
    >
      <View className="items-center gap-3 px-4 py-5">
        <Text className="font-ui-bold text-xs text-red" style={{ letterSpacing: 1 }}>
          {live ? 'COUPE DU MONDE · EN DIRECT' : 'COUPE DU MONDE · EN VEDETTE'}
        </Text>

        <View className="flex-row items-center justify-center gap-6">
          <Badge url={match.homeBadgeUrl} size={62} />
          {live ? (
            <Text className="font-display text-2xl text-white">
              {match.homeScore ?? 0} - {match.awayScore ?? 0}
            </Text>
          ) : (
            <Text className="font-display text-xl text-muted">VS</Text>
          )}
          <Badge url={match.awayBadgeUrl} size={62} />
        </View>

        <Text className="text-center font-display text-[22px] text-white">
          {frTeam(match.homeName)} — {frTeam(match.awayName)}
        </Text>
        <Text className="font-ui text-[13px] text-muted">
          {live ? (match.minute ? `${match.minute}' en cours` : 'En cours') : formatHeroDate(match.kickoff)}
        </Text>

        <Pressable
          onPress={() => router.push(`/match/${match._id}`)}
          className="mt-1 rounded-full bg-red px-7 py-3"
        >
          <Text className="font-ui-bold text-[15px] text-white">Pronostiquer</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}
