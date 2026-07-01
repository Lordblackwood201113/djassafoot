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
    <View className="flex-row items-center gap-2.5 border-t-2 border-white/10 py-2">
      <View
        className="h-8 w-8 items-center justify-center overflow-hidden border-2 border-white bg-ink"
        style={{ borderRadius: 0 }}
      >
        {p.photo ? (
          <Image source={{ uri: p.photo }} style={{ width: 32, height: 32 }} contentFit="cover" />
        ) : (
          <Text className="font-display text-[12px] text-white">{p.number ?? '·'}</Text>
        )}
      </View>
      {p.number != null ? (
        <Text className="w-5 text-center font-mono-bold text-[12px] text-muted">{p.number}</Text>
      ) : (
        <View className="w-5" />
      )}
      <Text numberOfLines={1} className="flex-1 font-mono-bold text-[13px] uppercase text-white">
        {p.name}
      </Text>
      {p.positionShort ? (
        <Text className="font-mono text-[10px] uppercase text-muted">{p.positionShort}</Text>
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
        <Text className="font-display text-[15px] uppercase text-white" style={{ letterSpacing: 0.5 }}>
          {frTeam(name)}
        </Text>
      </View>

      {starters.map((p, i) => (
        <PlayerRow key={`s${i}`} p={p} />
      ))}

      {subs.length > 0 ? (
        <>
          <View className="mt-3 flex-row items-center gap-1.5 pb-0.5">
            <View className="h-2 w-2 bg-red" />
            <Text className="font-mono-bold text-[10px] uppercase text-muted" style={{ letterSpacing: 1 }}>
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
      <View className="h-0.5 bg-white/20" />
      <TeamBlock name={awayName} players={away} />
    </View>
  );
}
