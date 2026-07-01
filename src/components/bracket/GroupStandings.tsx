import { Ionicons } from '@expo/vector-icons';
import type { Doc } from '@convex/_generated/dataModel';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { Flag } from '@/components/brutal/Flag';
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
      className="flex-row items-center gap-2 border-t-2 border-white/10 px-1 py-2.5"
    >
      <Text
        numberOfLines={1}
        className="flex-1 text-right font-mono-bold text-[12px] uppercase text-white"
      >
        {frTeam(m.homeName)}
      </Text>
      <Flag name={m.homeName} size={20} />
      <View className="min-w-[62px] items-center">
        <Text className="font-display text-[13px] text-white">
          {score ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}` : formatTime(m.kickoff)}
        </Text>
        <Text
          className={`font-mono text-[9px] uppercase ${live ? 'text-red' : 'text-muted'}`}
        >
          {live ? (m.minute ? `${m.minute}'` : 'LIVE') : finished ? 'TERMINÉ' : formatDay(m.kickoff)}
        </Text>
      </View>
      <Flag name={m.awayName} size={20} />
      <Text
        numberOfLines={1}
        className="flex-1 font-mono-bold text-[12px] uppercase text-white"
      >
        {frTeam(m.awayName)}
      </Text>
    </Pressable>
  );
}

export function GroupStandings({ rows, matches }: { rows: Row[]; matches: Match[] }) {
  const [open, setOpen] = useState<string | null>(null);

  // Officiel CdM 2026 : qualifiés = 2 premiers de chaque poule + les 8 meilleurs 3es.
  // On le déduit directement de l'API : toute équipe présente dans un 16e (round '32') est
  // qualifiée (couvre donc les meilleurs 3es sans recalculer leur classement).
  const qualifiedIds = new Set<string>();
  for (const m of matches) {
    if (m.round !== '32') continue;
    if (m.homeTeamApiId) qualifiedIds.add(m.homeTeamApiId);
    if (m.awayTeamApiId) qualifiedIds.add(m.awayTeamApiId);
  }

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
    <View className="gap-4 px-5 pb-6">
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-2">
          <View className="h-[10px] w-[10px] bg-red" />
          <Text className="font-display text-lg uppercase text-white" style={{ letterSpacing: 0.5 }}>
            Phase de groupes
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="h-[9px] w-[9px] bg-green" />
          <Text className="font-mono text-[10px] uppercase text-muted">Qualifié</Text>
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
          <BrutalBox key={grp.key} shadow="#E5342B" offset={5} className="bg-surface-3 px-3.5 pb-2.5 pt-3">
            <Pressable
              onPress={() => setOpen(isOpen ? null : grp.key)}
              className="flex-row items-center justify-between px-1 pb-2.5"
            >
              <View className="flex-row items-center gap-1.5">
                <Text className="font-display text-[15px] uppercase text-white" style={{ letterSpacing: 0.5 }}>
                  {frGroup(grp.key)}
                </Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color="#9AA4CC" />
              </View>
              <View className="flex-row">
                <Text className="w-7 text-center font-mono text-[10px] uppercase text-muted">J</Text>
                <Text className="w-9 text-center font-mono text-[10px] uppercase text-muted">Diff</Text>
                <Text className="w-7 text-center font-mono text-[10px] uppercase text-muted">Pts</Text>
              </View>
            </Pressable>

            {grp.rows.map((r) => {
              // Qualifié = présent en 16es (2 premiers + meilleurs 3es) ; repli sur le top 2
              // tant que les 16es ne sont pas encore créés (les 2 premiers passent toujours).
              const qualified = (!!r.teamApiId && qualifiedIds.has(r.teamApiId)) || r.rank <= 2;
              return (
                <View
                  key={r._id}
                  className="flex-row items-center gap-2.5 border-t-2 border-white/10 py-2"
                >
                  <View
                    className="h-[8px] w-[8px]"
                    style={{ backgroundColor: qualified ? '#3FCB86' : 'transparent' }}
                  />
                  <Text className="w-3 font-display text-[13px] text-muted">{r.rank}</Text>
                  <Flag name={r.teamName} size={24} />
                  <Text
                    numberOfLines={1}
                    className="flex-1 font-mono-bold text-[13px] uppercase text-white"
                  >
                    {frTeam(r.teamName)}
                  </Text>
                  <View className="flex-row">
                    <Text className="w-7 text-center font-mono text-[12px] text-muted">{r.played}</Text>
                    <Text className="w-9 text-center font-mono text-[12px] text-muted">
                      {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                    </Text>
                    <Text className="w-7 text-center font-display text-[14px] text-white">
                      {r.points}
                    </Text>
                  </View>
                </View>
              );
            })}

            {isOpen ? (
              <View className="mt-2.5 border-t-2 border-white/20 pt-2">
                <View className="flex-row items-center gap-1.5 px-1 pb-1">
                  <View className="h-[8px] w-[8px] bg-red" />
                  <Text className="font-mono-bold text-[10px] uppercase text-muted">Confrontations</Text>
                </View>
                {confront.length > 0 ? (
                  confront.map((m) => <Confrontation key={m._id} m={m} />)
                ) : (
                  <Text className="px-1 py-2 font-mono text-[11px] uppercase text-muted">
                    Aucun match pour le moment.
                  </Text>
                )}
              </View>
            ) : null}
          </BrutalBox>
        );
      })}
    </View>
  );
}
