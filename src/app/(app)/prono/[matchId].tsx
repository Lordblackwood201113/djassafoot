import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { exactOdds } from '@convex/oddsShared';
import { useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Badge } from '@/components/match/Badge';
import { ScreenBackground } from '@/components/ScreenBackground';
import { formatDay, formatTime } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';
import { usePronoDraft, type Leg, type Market } from '@/store/pronoDraftStore';

function OddButton({
  label,
  odd,
  selected,
  onPress,
}: {
  label: string;
  odd: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center rounded-2xl border py-2.5 ${
        selected ? 'border-red bg-red' : 'border-white/[0.05] bg-surface'
      }`}
    >
      <Text numberOfLines={1} className="px-1 font-ui-semibold text-[13px] text-white">
        {label}
      </Text>
      <Text className={`mt-0.5 font-display-bold text-[15px] ${selected ? 'text-white' : 'text-red'}`}>
        {odd.toFixed(2)}
      </Text>
    </Pressable>
  );
}

function SectionHead({ title, tag }: { title: string; tag?: string }) {
  return (
    <View className="mb-2 mt-5 flex-row items-center justify-between">
      <Text className="font-display-bold text-[15px] text-white">{title}</Text>
      {tag ? <Text className="font-ui-medium text-[12px] text-muted">{tag}</Text> : null}
    </View>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={() => onChange(Math.max(0, value - 1))}
        className="h-9 w-9 items-center justify-center rounded-xl bg-surface-2"
      >
        <Ionicons name="remove" size={18} color="#ffffff" />
      </Pressable>
      <Text className="w-7 text-center font-display-bold text-xl text-white">{value}</Text>
      <Pressable
        onPress={() => onChange(Math.min(9, value + 1))}
        className="h-9 w-9 items-center justify-center rounded-xl bg-surface-2"
      >
        <Ionicons name="add" size={18} color="#ffffff" />
      </Pressable>
    </View>
  );
}

export default function PronoScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const id = matchId as Id<'matches'>;
  const match = useQuery(api.matches.byId, matchId ? { id } : 'skip');
  const odds = useQuery(api.bets.oddsForMatch, matchId ? { matchId: id } : 'skip');

  const { legs, toggleLeg, setLeg, setMatch } = usePronoDraft();
  const [hg, setHg] = useState(1);
  const [ag, setAg] = useState(1);

  useEffect(() => {
    if (matchId) setMatch(matchId);
  }, [matchId, setMatch]);

  const exactOdd = useMemo(
    () => (odds ? exactOdds(odds.lambdas, hg, ag) : 0),
    [odds, hg, ag],
  );
  const exactOn = !!legs['exact_score'];

  const updateExact = (nh: number, na: number) => {
    setHg(nh);
    setAg(na);
    if (exactOn && odds) {
      setLeg('exact_score', {
        market: 'exact_score',
        pick: `${nh}-${na}`,
        label: `${nh} - ${na}`,
        odds: exactOdds(odds.lambdas, nh, na),
      });
    }
  };

  const pickResult = (pick: 'home' | 'draw' | 'away', label: string, odd: number) =>
    toggleLeg({ market: 'result_1x2', pick, label, odds: odd });

  const selectedCount = Object.keys(legs).length;
  const home = match ? frTeam(match.homeName) : '';
  const away = match ? frTeam(match.awayName) : '';
  const ready = match?.status === 'scheduled' && match.kickoff > now;

  return (
    <ScreenBackground variant="app">
      <View className="flex-1 pt-12">
        <View className="flex-row items-center px-4 pb-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
            className="h-9 w-9 items-center justify-center rounded-2xl bg-surface"
          >
            <Ionicons name="close" size={20} color="#ffffff" />
          </Pressable>
          <Text className="flex-1 text-center font-display-bold text-base text-white">
            Mon pronostic
          </Text>
          <View className="h-9 w-9" />
        </View>

        {!match || !odds ? (
          <Text className="mt-20 text-center font-ui text-sm text-muted">Chargement…</Text>
        ) : (
          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Carte match */}
            <View className="mt-1 flex-row items-center rounded-2xl bg-surface px-4 py-3">
              <View className="flex-1 flex-row items-center gap-2">
                <Badge url={match.homeBadgeUrl} size={26} />
                <Text numberOfLines={1} className="flex-shrink font-ui-semibold text-[14px] text-white">
                  {home}
                </Text>
              </View>
              <View className="items-center px-2">
                <Text className="font-display-bold text-[15px] text-white">{formatTime(match.kickoff)}</Text>
                <Text className="font-ui text-[11px] text-muted">{formatDay(match.kickoff)}</Text>
              </View>
              <View className="flex-1 flex-row items-center justify-end gap-2">
                <Text numberOfLines={1} className="flex-shrink text-right font-ui-semibold text-[14px] text-white">
                  {away}
                </Text>
                <Badge url={match.awayBadgeUrl} size={26} />
              </View>
            </View>

            {!ready ? (
              <Text className="mt-6 text-center font-ui text-sm text-muted">
                Les pronos sont fermés (match commencé ou terminé).
              </Text>
            ) : (
              <>
                <SectionHead title="Résultat du match" tag="1N2" />
                <View className="flex-row gap-2">
                  <OddButton
                    label={home}
                    odd={odds.home}
                    selected={legs['result_1x2']?.pick === 'home'}
                    onPress={() => pickResult('home', home, odds.home)}
                  />
                  <OddButton
                    label="Nul"
                    odd={odds.draw}
                    selected={legs['result_1x2']?.pick === 'draw'}
                    onPress={() => pickResult('draw', 'Match nul', odds.draw)}
                  />
                  <OddButton
                    label={away}
                    odd={odds.away}
                    selected={legs['result_1x2']?.pick === 'away'}
                    onPress={() => pickResult('away', away, odds.away)}
                  />
                </View>

                <SectionHead title="Nombre de buts" tag="2.5" />
                <View className="flex-row gap-2">
                  <OddButton
                    label="Plus de 2.5"
                    odd={odds.over}
                    selected={legs['over_under_2_5']?.pick === 'over'}
                    onPress={() =>
                      toggleLeg({ market: 'over_under_2_5', pick: 'over', label: 'Plus de 2.5 buts', odds: odds.over })
                    }
                  />
                  <OddButton
                    label="Moins de 2.5"
                    odd={odds.under}
                    selected={legs['over_under_2_5']?.pick === 'under'}
                    onPress={() =>
                      toggleLeg({ market: 'over_under_2_5', pick: 'under', label: 'Moins de 2.5 buts', odds: odds.under })
                    }
                  />
                </View>

                <SectionHead title="Les deux marquent" />
                <View className="flex-row gap-2">
                  <OddButton
                    label="Oui"
                    odd={odds.bttsYes}
                    selected={legs['btts']?.pick === 'yes'}
                    onPress={() =>
                      toggleLeg({ market: 'btts', pick: 'yes', label: 'Les deux marquent', odds: odds.bttsYes })
                    }
                  />
                  <OddButton
                    label="Non"
                    odd={odds.bttsNo}
                    selected={legs['btts']?.pick === 'no'}
                    onPress={() =>
                      toggleLeg({ market: 'btts', pick: 'no', label: 'Pas les deux qui marquent', odds: odds.bttsNo })
                    }
                  />
                </View>

                <SectionHead title="Score exact" tag="optionnel" />
                <View className="flex-row items-center justify-between rounded-2xl bg-surface px-4 py-3">
                  <Stepper value={hg} onChange={(n) => updateExact(n, ag)} />
                  <Text className="font-display-bold text-lg text-muted">:</Text>
                  <Stepper value={ag} onChange={(n) => updateExact(hg, n)} />
                  <Pressable
                    onPress={() =>
                      exactOn
                        ? setLeg('exact_score', null)
                        : setLeg('exact_score', {
                            market: 'exact_score',
                            pick: `${hg}-${ag}`,
                            label: `${hg} - ${ag}`,
                            odds: exactOdd,
                          })
                    }
                    className={`items-center rounded-xl border px-3 py-2 ${
                      exactOn ? 'border-red bg-red' : 'border-red/40 bg-red/[0.12]'
                    }`}
                  >
                    <Text className="font-display-bold text-[15px] text-white">{exactOdd.toFixed(2)}</Text>
                    <Text className="font-ui text-[10px] text-white/80">{exactOn ? 'Retirer' : 'Ajouter'}</Text>
                  </Pressable>
                </View>

                {/* Buteur — Phase ultérieure (besoin des effectifs) */}
                <SectionHead title="Buteur du match" tag="bientôt" />
                <View className="flex-row items-center gap-3 rounded-2xl bg-surface px-4 py-3 opacity-60">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-2">
                    <Ionicons name="football-outline" size={18} color="#9AA4CC" />
                  </View>
                  <Text className="flex-1 font-ui-medium text-[13px] text-muted">
                    Le choix du buteur arrive bientôt
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        )}

        {ready ? (
          <View className="border-t border-white/[0.06] px-5 pb-9 pt-3">
            <Pressable
              disabled={selectedCount === 0}
              onPress={() => router.push('/prono/slip')}
              className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 ${
                selectedCount === 0 ? 'bg-surface-2' : 'bg-red'
              }`}
            >
              <Ionicons name="checkmark-circle" size={18} color={selectedCount === 0 ? '#6B76A8' : '#ffffff'} />
              <Text
                className={`font-display-bold text-[15px] ${selectedCount === 0 ? 'text-muted' : 'text-white'}`}
              >
                {selectedCount === 0
                  ? 'Choisis au moins un pari'
                  : `Valider · ${selectedCount} sélection${selectedCount > 1 ? 's' : ''}`}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScreenBackground>
  );
}
