import { Ionicons } from '@expo/vector-icons';
import type { Doc } from '@convex/_generated/dataModel';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { formatDay, formatTime } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';

type Row = Doc<'standings'>;
type Match = Doc<'matches'>;

function frGroup(g?: string) {
  return g ? g.replace(/^Group\b/, 'Groupe') : 'Groupe';
}

function Confrontation({ m }: { m: Match }) {
  const router = useRouter();
  const live = m.status === 'live';
  const finished = m.status === 'finished';
  const score = live || finished;
  return (
    <Pressable
      onPress={() => router.push(`/match/${m._id}`)}
      className="flex-row items-center gap-2 px-1 py-2"
    >
      <Text numberOfLines={1} className="flex-1 text-right font-ui-medium text-[13px] text-white">
        {frTeam(m.homeName)}
      </Text>
      {m.homeBadgeUrl ? (
        <Image source={{ uri: m.homeBadgeUrl }} style={{ width: 20, height: 20, borderRadius: 10 }} contentFit="cover" />
      ) : (
        <View className="h-5 w-5 rounded-full bg-surface-2" />
      )}
      <View className="min-w-[58px] items-center">
        <Text className="font-display-bold text-[13px] text-white">
          {score ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}` : formatTime(m.kickoff)}
        </Text>
        <Text className="font-ui text-[10px] text-muted">
          {live ? (m.minute ? `${m.minute}'` : 'Live') : finished ? 'Terminé' : formatDay(m.kickoff)}
        </Text>
      </View>
      {m.awayBadgeUrl ? (
        <Image source={{ uri: m.awayBadgeUrl }} style={{ width: 20, height: 20, borderRadius: 10 }} contentFit="cover" />
      ) : (
        <View className="h-5 w-5 rounded-full bg-surface-2" />
      )}
      <Text numberOfLines={1} className="flex-1 font-ui-medium text-[13px] text-white">
        {frTeam(m.awayName)}
      </Text>
    </Pressable>
  );
}

export function GroupStandings({ rows, matches }: { rows: Row[]; matches: Match[] }) {
  const [open, setOpen] = useState<string | null>(null);

  const groups: { key: string; rows: Row[] }[] = [];
  const map: Record<string, Row[]> = {};
  for (const r of rows) {
    const g = r.group ?? '—';
    if (!map[g]) {
      map[g] = [];
      groups.push({ key: g, rows: map[g] });
    }
    map[g].push(r);
  }

  return (
    <View className="gap-3.5 px-5 pb-6">
      <View className="flex-row items-center justify-between px-1">
        <Text className="font-display-bold text-lg text-white">Phase de groupes</Text>
        <View className="flex-row items-center gap-1.5">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: '#5DCAA5' }} />
          <Text className="font-ui text-xs text-muted">Qualifié</Text>
        </View>
      </View>

      {groups.map((grp) => {
        const isOpen = open === grp.key;
        const teamIds = new Set(grp.rows.map((r) => r.teamApiId).filter(Boolean) as string[]);
        const confront = matches
          .filter(
            (m) =>
              m.homeTeamApiId &&
              m.awayTeamApiId &&
              teamIds.has(m.homeTeamApiId) &&
              teamIds.has(m.awayTeamApiId),
          )
          .sort((a, b) => a.kickoff - b.kickoff);

        return (
          <View key={grp.key} className="rounded-2xl bg-surface px-3.5 pb-2 pt-3">
            <Pressable
              onPress={() => setOpen(isOpen ? null : grp.key)}
              className="flex-row items-center justify-between px-1 pb-2"
            >
              <View className="flex-row items-center gap-1.5">
                <Text className="font-display-bold text-[15px] text-white">{frGroup(grp.key)}</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#9AA4CC" />
              </View>
              <View className="flex-row">
                <Text className="w-7 text-center font-ui-medium text-[11px] text-muted">J</Text>
                <Text className="w-9 text-center font-ui-medium text-[11px] text-muted">Diff</Text>
                <Text className="w-7 text-center font-ui-medium text-[11px] text-muted">Pts</Text>
              </View>
            </Pressable>

            {grp.rows.map((r) => {
              const qualified = r.rank <= 2;
              return (
                <View key={r._id} className="flex-row items-center gap-2.5 py-1.5">
                  <View
                    className="h-[7px] w-[7px] rounded-full"
                    style={{ backgroundColor: qualified ? '#5DCAA5' : 'transparent' }}
                  />
                  <Text className="w-3 font-display-bold text-[13px] text-muted">{r.rank}</Text>
                  {r.badgeUrl ? (
                    <Image source={{ uri: r.badgeUrl }} style={{ width: 24, height: 24, borderRadius: 12 }} contentFit="cover" />
                  ) : (
                    <View className="h-6 w-6 rounded-full bg-surface-2" />
                  )}
                  <Text numberOfLines={1} className="flex-1 font-ui-medium text-[14px] text-white">
                    {frTeam(r.teamName)}
                  </Text>
                  <View className="flex-row">
                    <Text className="w-7 text-center font-ui text-[13px] text-muted">{r.played}</Text>
                    <Text className="w-9 text-center font-ui text-[13px] text-muted">
                      {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                    </Text>
                    <Text className="w-7 text-center font-display-bold text-[15px] text-white">
                      {r.points}
                    </Text>
                  </View>
                </View>
              );
            })}

            {isOpen ? (
              <View className="mt-2 border-t border-white/[0.07] pt-2">
                <Text className="px-1 pb-1 font-ui-medium text-[11px] text-muted">Confrontations</Text>
                {confront.length > 0 ? (
                  confront.map((m) => <Confrontation key={m._id} m={m} />)
                ) : (
                  <Text className="px-1 py-2 font-ui text-xs text-muted">Aucun match pour le moment.</Text>
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
