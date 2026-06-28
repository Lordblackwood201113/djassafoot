import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { CompetitionSwitcher } from '@/components/CompetitionSwitcher';
import { MatchRow } from '@/components/match/MatchRow';
import { ScreenBackground } from '@/components/ScreenBackground';
import { SegmentControl } from '@/components/ui/SegmentControl';
import { phaseHeading } from '@/lib/format';

const DAY = 24 * 60 * 60 * 1000;
const SEGMENTS = [
  { key: 'yesterday', label: 'Hier' },
  { key: 'today', label: "Aujourd'hui" },
  { key: 'upcoming', label: 'À venir' },
];

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export default function Matches() {
  const router = useRouter();
  const all = useQuery(api.matches.list);
  const [seg, setSeg] = useState('today');

  const filtered = useMemo(() => {
    if (!all) return [];
    const todayStart = startOfToday();
    return all.filter((m) => {
      if (seg === 'yesterday') return m.kickoff >= todayStart - DAY && m.kickoff < todayStart;
      if (seg === 'today') return m.kickoff >= todayStart && m.kickoff < todayStart + DAY;
      return m.kickoff >= todayStart + DAY;
    });
  }, [all, seg]);

  // Regroupe les matchs par phase (poule / 16es / …) → en-tête par section.
  const sections = useMemo(() => {
    const out: { heading: string; matches: typeof filtered }[] = [];
    for (const m of filtered) {
      const heading = phaseHeading(m.round);
      const last = out[out.length - 1];
      if (last && last.heading === heading) last.matches.push(m);
      else out.push({ heading, matches: [m] });
    }
    return out;
  }, [filtered]);

  const emptyLabel =
    seg === 'yesterday' ? 'hier' : seg === 'today' ? "aujourd'hui" : 'à venir';

  return (
    <ScreenBackground variant="app">
      <View className="flex-1">
        <AppHeader />

        <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
          <Text className="font-display text-2xl text-white">Matchs</Text>
          <View className="flex-row items-center gap-2.5">
            <Pressable
              onPress={() => router.push('/bracket')}
              className="h-9 w-9 items-center justify-center rounded-2xl bg-surface"
            >
              <MaterialCommunityIcons name="tournament" size={20} color="#ffffff" />
            </Pressable>
            <CompetitionSwitcher />
          </View>
        </View>

        <View className="pb-3.5">
          <SegmentControl segments={SEGMENTS} value={seg} onChange={setSeg} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((sec) => (
            <View key={sec.heading}>
              <View className="flex-row items-center gap-2 px-5 pb-1.5 pt-4">
                <View className="h-3.5 w-1 rounded-full bg-red" />
                <Text className="font-display-bold text-[14px] text-white">{sec.heading}</Text>
                <Text className="font-ui text-[12px] text-muted">{sec.matches.length}</Text>
              </View>
              {sec.matches.map((m) => (
                <MatchRow key={m._id} match={m} />
              ))}
            </View>
          ))}
          {all !== undefined && filtered.length === 0 ? (
            <Text className="mt-12 text-center font-ui text-sm text-muted">
              Aucun match {emptyLabel}.
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}
