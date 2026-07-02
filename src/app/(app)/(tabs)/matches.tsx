import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalSegment } from '@/components/brutal/Segment';
import { CompetitionSwitcher } from '@/components/CompetitionSwitcher';
import { MatchRow } from '@/components/match/MatchRow';
import { ScreenBackground } from '@/components/ScreenBackground';
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
          <Text className="font-display text-[26px] text-white">
            Matchs
          </Text>
          <View className="flex-row items-center gap-2.5">
            <Pressable
              onPress={() => router.push('/bracket')}
              className="h-9 w-9 items-center justify-center rounded-[13px] border border-hairline bg-surface-2"
            >
              <MaterialCommunityIcons name="tournament" size={18} color="#ffffff" />
            </Pressable>
            <CompetitionSwitcher />
          </View>
        </View>

        <View className="px-5 pb-3.5">
          <BrutalSegment options={SEGMENTS} value={seg} onChange={setSeg} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((sec) => (
            <View key={sec.heading} className="px-5 pt-4">
              <View className="mb-2 flex-row items-center gap-2.5">
                <Text className="font-display text-[14px] text-white">
                  {sec.heading}
                </Text>
                <Text className="font-ui-semibold text-[12px] text-muted">{sec.matches.length}</Text>
              </View>
              <BrutalBox className="bg-surface-3">
                {sec.matches.map((m) => (
                  <MatchRow key={m._id} match={m} />
                ))}
              </BrutalBox>
            </View>
          ))}
          {all !== undefined && filtered.length === 0 ? (
            <Text className="mt-12 text-center font-ui-medium text-[12px] text-muted">
              Aucun match {emptyLabel}.
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}
