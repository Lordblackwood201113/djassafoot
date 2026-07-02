import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { Flag } from '@/components/brutal/Flag';
import { frTeam } from '@/lib/teamNames';

export type LineupPlayer = {
  name: string;
  photo?: string;
  position?: string;
  positionShort?: string;
  number?: number;
  grid?: string; // "ligne:colonne" (API-Football) pour le placement terrain
  apiId?: number; // id joueur API-Football
  rating?: number; // note post-match (API-Football games.rating)
  isSub: boolean;
  isHome: boolean;
};

function PlayerRow({ p }: { p: LineupPlayer }) {
  return (
    <View className="flex-row items-center gap-2.5 border-t border-line py-2">
      <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-surface-2">
        {p.photo ? (
          <Image source={{ uri: p.photo }} style={{ width: 32, height: 32 }} contentFit="cover" />
        ) : (
          <Text className="font-display text-[12px] text-white">{p.number ?? '·'}</Text>
        )}
      </View>
      {p.number != null ? (
        <Text className="w-5 text-center font-ui-semibold text-[12px] text-muted">{p.number}</Text>
      ) : (
        <View className="w-5" />
      )}
      <Text numberOfLines={1} className="flex-1 font-ui-semibold text-[13px] text-white">
        {p.name}
      </Text>
      {p.positionShort ? (
        <Text className="font-ui-medium text-[10px] text-muted">{p.positionShort}</Text>
      ) : null}
    </View>
  );
}

function TeamBlock({
  name,
  players,
}: {
  name: string;
  players: LineupPlayer[];
}) {
  const starters = players.filter((p) => !p.isSub);
  const subs = players.filter((p) => p.isSub);
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2 pb-1">
        <Flag name={name} size={22} />
        <Text className="font-display text-[15px] text-white">
          {frTeam(name)}
        </Text>
      </View>

      {starters.map((p, i) => (
        <PlayerRow key={`s${i}`} p={p} />
      ))}

      {subs.length > 0 ? (
        <>
          <View className="mt-3 flex-row items-center gap-1.5 pb-0.5">
            <Text className="font-ui-semibold text-[10px] text-muted">
              Remplaçants
            </Text>
          </View>
          {subs.map((p, i) => (
            <PlayerRow key={`b${i}`} p={p} />
          ))}
        </>
      ) : null}
    </View>
  );
}

export function LineupView({
  lineup,
  homeName,
  awayName,
}: {
  lineup: LineupPlayer[];
  homeName: string;
  awayName: string;
}) {
  const home = lineup.filter((p) => p.isHome);
  const away = lineup.filter((p) => !p.isHome);

  return (
    <View className="gap-5">
      <TeamBlock name={homeName} players={home} />
      <View className="h-px bg-line" />
      <TeamBlock name={awayName} players={away} />
    </View>
  );
}
