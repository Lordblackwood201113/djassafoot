import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { exactOdds } from '@convex/oddsShared';
import { useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { Flag } from '@/components/brutal/Flag';
import { ScreenBackground } from '@/components/ScreenBackground';
import { hardShadow } from '@/lib/brutal';
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
      style={[
        {
          flex: 1,
          alignItems: 'center',
          borderRadius: 0,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          paddingVertical: 12,
          backgroundColor: selected ? '#E5342B' : '#131C3F',
        },
        selected ? hardShadow('#0A1230', 4) : hardShadow('#E5342B', 4),
      ]}
    >
      <Text
        numberOfLines={1}
        className="px-1 font-mono-bold text-[12px] uppercase text-white"
        style={{ letterSpacing: 0.3 }}
      >
        {label}
      </Text>
      <Text
        className="mt-1 font-display text-[16px]"
        style={{ color: selected ? '#FFFFFF' : '#E5342B', letterSpacing: 0.5 }}
      >
        {odd.toFixed(2)}
      </Text>
    </Pressable>
  );
}

function SectionHead({ title, tag }: { title: string; tag?: string }) {
  return (
    <View className="mb-2 mt-6 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2">
        <View style={{ width: 10, height: 10, backgroundColor: '#E5342B' }} />
        <Text
          className="font-display text-[15px] uppercase text-white"
          style={{ letterSpacing: 0.5 }}
        >
          {title}
        </Text>
      </View>
      {tag ? (
        <Text
          className="font-mono-bold text-[11px] uppercase text-muted"
          style={{ letterSpacing: 0.5 }}
        >
          {tag}
        </Text>
      ) : null}
    </View>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View className="flex-row items-center gap-2">
      <Pressable
        onPress={() => onChange(Math.max(0, value - 1))}
        style={{
          height: 40,
          width: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 0,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          backgroundColor: '#0A1230',
        }}
      >
        <Ionicons name="remove" size={18} color="#ffffff" />
      </Pressable>
      <Text
        className="w-8 text-center font-display text-xl text-white"
        style={{ letterSpacing: 0.5 }}
      >
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(9, value + 1))}
        style={{
          height: 40,
          width: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 0,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          backgroundColor: '#0A1230',
        }}
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
        <View className="flex-row items-center gap-3 px-4 pb-3">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
            style={[
              {
                height: 40,
                width: 40,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 0,
                borderWidth: 2,
                borderColor: '#FFFFFF',
                backgroundColor: '#0A1230',
              },
              hardShadow('#E5342B', 4),
            ]}
          >
            <Ionicons name="close" size={20} color="#ffffff" />
          </Pressable>
          <View className="flex-1">
            <Text
              className="font-display text-base uppercase text-white"
              style={{ letterSpacing: 1 }}
            >
              Mon pronostic
            </Text>
            <View style={{ marginTop: 4, height: 3, width: 44, backgroundColor: '#E5342B' }} />
          </View>
        </View>

        {!match || !odds ? (
          <Text
            className="mt-20 text-center font-mono uppercase text-sm text-muted"
            style={{ letterSpacing: 1 }}
          >
            Chargement…
          </Text>
        ) : (
          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 6 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Carte match */}
            <BrutalBox shadow="#E5342B" offset={6} borderWidth={2} className="flex-row items-center bg-surface-3 px-4 py-3">
              <View className="flex-1 flex-row items-center gap-2">
                <Flag name={match.homeName} size={26} />
                <Text
                  numberOfLines={1}
                  className="flex-shrink font-mono-bold text-[13px] uppercase text-white"
                >
                  {home}
                </Text>
              </View>
              <View className="items-center px-2">
                <Text
                  className="font-display text-[16px] text-white"
                  style={{ letterSpacing: 0.5 }}
                >
                  {formatTime(match.kickoff)}
                </Text>
                <Text className="font-mono text-[10px] uppercase text-muted">
                  {formatDay(match.kickoff)}
                </Text>
              </View>
              <View className="flex-1 flex-row items-center justify-end gap-2">
                <Text
                  numberOfLines={1}
                  className="flex-shrink text-right font-mono-bold text-[13px] uppercase text-white"
                >
                  {away}
                </Text>
                <Flag name={match.awayName} size={26} />
              </View>
            </BrutalBox>

            {!ready ? (
              <Text
                className="mt-8 text-center font-mono uppercase text-sm text-muted"
                style={{ letterSpacing: 0.5 }}
              >
                Les pronos sont fermés (match commencé ou terminé).
              </Text>
            ) : (
              <>
                <SectionHead title="Résultat du match" tag="1N2" />
                <View className="flex-row gap-3">
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
                <View className="flex-row gap-3">
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
                <View className="flex-row gap-3">
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
                <BrutalBox shadow="#E5342B" offset={5} borderWidth={2} className="flex-row items-center justify-between bg-surface-3 px-4 py-3">
                  <Stepper value={hg} onChange={(n) => updateExact(n, ag)} />
                  <Text
                    className="font-display text-lg text-muted"
                    style={{ letterSpacing: 1 }}
                  >
                    :
                  </Text>
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
                    style={[
                      {
                        alignItems: 'center',
                        borderRadius: 0,
                        borderWidth: 2,
                        borderColor: '#FFFFFF',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        backgroundColor: exactOn ? '#E5342B' : '#0A1230',
                      },
                      hardShadow(exactOn ? '#0A1230' : '#E5342B', 3),
                    ]}
                  >
                    <Text
                      className="font-display text-[15px] text-white"
                      style={{ letterSpacing: 0.5 }}
                    >
                      {exactOdd.toFixed(2)}
                    </Text>
                    <Text className="font-mono text-[9px] uppercase text-white">
                      {exactOn ? 'Retirer' : 'Ajouter'}
                    </Text>
                  </Pressable>
                </BrutalBox>

                {/* Buteur — Phase ultérieure (besoin des effectifs) */}
                <SectionHead title="Buteur du match" tag="bientôt" />
                <BrutalBox shadow={false} borderWidth={2} className="flex-row items-center gap-3 bg-surface-3 px-4 py-3 opacity-60">
                  <View
                    style={{
                      height: 40,
                      width: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 0,
                      borderWidth: 2,
                      borderColor: '#9AA4CC',
                      backgroundColor: '#0A1230',
                    }}
                  >
                    <Ionicons name="football-outline" size={18} color="#9AA4CC" />
                  </View>
                  <Text className="flex-1 font-mono-bold text-[12px] uppercase text-muted">
                    Le choix du buteur arrive bientôt
                  </Text>
                </BrutalBox>
              </>
            )}
          </ScrollView>
        )}

        {ready ? (
          <View
            className="px-5 pb-9 pt-4"
            style={{ borderTopWidth: 2, borderTopColor: '#FFFFFF' }}
          >
            <BrutalButton
              variant={selectedCount === 0 ? 'ghost' : 'primary'}
              disabled={selectedCount === 0}
              onPress={() => router.push('/prono/slip')}
              label={
                selectedCount === 0
                  ? 'Choisis au moins un pari'
                  : `Valider · ${selectedCount} sélection${selectedCount > 1 ? 's' : ''}`
              }
            />
          </View>
        ) : null}
      </View>
    </ScreenBackground>
  );
}
