import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { isPickCompatible, validateLegs } from '@convex/betRules';
import { exactOdds } from '@convex/oddsShared';
import { useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { Flag } from '@/components/brutal/Flag';
import { ScreenBackground } from '@/components/ScreenBackground';
import { formatDay, formatTime } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';
import { usePronoDraft, type Leg, type Market } from '@/store/pronoDraftStore';

function OddButton({
  label,
  odd,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  odd: number;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={{
        flex: 1,
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? '#F5F5F4' : 'rgba(255,255,255,0.1)',
        paddingVertical: 12,
        backgroundColor: selected ? '#F5F5F4' : '#151518',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text
        numberOfLines={1}
        className="px-1 font-ui-semibold text-[12px]"
        style={{ color: selected ? '#0A0A0B' : '#FFFFFF' }}
      >
        {label}
      </Text>
      <Text
        className="mt-1 font-display text-[16px]"
        style={{ color: selected ? '#0A0A0B' : '#FFFFFF' }}
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
        <Text className="font-display text-[15px] text-white">
          {title}
        </Text>
      </View>
      {tag ? (
        <Text className="font-ui-semibold text-[11px] text-muted">
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
          borderRadius: 13,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          backgroundColor: '#1C1C20',
        }}
      >
        <Ionicons name="remove" size={18} color="#ffffff" />
      </Pressable>
      <Text className="w-8 text-center font-display text-xl text-white">
        {value}
      </Text>
      <Pressable
        onPress={() => onChange(Math.min(9, value + 1))}
        style={{
          height: 40,
          width: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 13,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          backgroundColor: '#1C1C20',
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
  const insets = useSafeAreaInsets();
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

  // Anti-paris-illégaux : une option est désactivée si l'ajouter rendrait la combinaison
  // impossible (R2) ou incompatible avec le score exact / R1. Une option déjà sélectionnée
  // reste toujours désélectionnable.
  const currentLegs = Object.values(legs).map((l) => ({ market: l.market, pick: l.pick }));
  const disabledFor = (market: Market, pick: string) =>
    legs[market]?.pick === pick ? false : !isPickCompatible(currentLegs, { market, pick });
  const exactDisabled =
    !exactOn && !isPickCompatible(currentLegs, { market: 'exact_score', pick: `${hg}-${ag}` });
  // Garde-fou : la combinaison courante reste-t-elle cohérente ? (ex. score modifié via steppers)
  const legality = validateLegs(currentLegs);

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
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center gap-3 px-4 pb-3">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
            style={{
              height: 40,
              width: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 13,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              backgroundColor: '#1C1C20',
            }}
          >
            <Ionicons name="close" size={20} color="#ffffff" />
          </Pressable>
          <View className="flex-1">
            <Text className="font-display text-base text-white">
              Mon pronostic
            </Text>
          </View>
        </View>

        {!match || !odds ? (
          <Text className="mt-20 text-center font-ui-medium text-sm text-muted">
            Chargement…
          </Text>
        ) : (
          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 24, paddingTop: 6 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Carte match */}
            <BrutalBox shadow={false} borderWidth={1} className="flex-row items-center rounded-2xl bg-card px-4 py-3">
              <View className="flex-1 flex-row items-center gap-2">
                <Flag name={match.homeName} size={26} />
                <Text
                  numberOfLines={1}
                  className="flex-shrink font-ui-semibold text-[13px] text-white"
                >
                  {home}
                </Text>
              </View>
              <View className="items-center px-2">
                <Text className="font-display text-[16px] text-white">
                  {formatTime(match.kickoff)}
                </Text>
                <Text className="font-ui-medium text-[10px] text-muted">
                  {formatDay(match.kickoff)}
                </Text>
              </View>
              <View className="flex-1 flex-row items-center justify-end gap-2">
                <Text
                  numberOfLines={1}
                  className="flex-shrink text-right font-ui-semibold text-[13px] text-white"
                >
                  {away}
                </Text>
                <Flag name={match.awayName} size={26} />
              </View>
            </BrutalBox>

            {!ready ? (
              <Text className="mt-8 text-center font-ui-medium text-sm text-muted">
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
                    disabled={disabledFor('result_1x2', 'home')}
                    onPress={() => pickResult('home', home, odds.home)}
                  />
                  <OddButton
                    label="Nul"
                    odd={odds.draw}
                    selected={legs['result_1x2']?.pick === 'draw'}
                    disabled={disabledFor('result_1x2', 'draw')}
                    onPress={() => pickResult('draw', 'Match nul', odds.draw)}
                  />
                  <OddButton
                    label={away}
                    odd={odds.away}
                    selected={legs['result_1x2']?.pick === 'away'}
                    disabled={disabledFor('result_1x2', 'away')}
                    onPress={() => pickResult('away', away, odds.away)}
                  />
                </View>

                <SectionHead title="Nombre de buts" tag="2.5" />
                <View className="flex-row gap-3">
                  <OddButton
                    label="Plus de 2.5"
                    odd={odds.over}
                    selected={legs['over_under_2_5']?.pick === 'over'}
                    disabled={disabledFor('over_under_2_5', 'over')}
                    onPress={() =>
                      toggleLeg({ market: 'over_under_2_5', pick: 'over', label: 'Plus de 2.5 buts', odds: odds.over })
                    }
                  />
                  <OddButton
                    label="Moins de 2.5"
                    odd={odds.under}
                    selected={legs['over_under_2_5']?.pick === 'under'}
                    disabled={disabledFor('over_under_2_5', 'under')}
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
                    disabled={disabledFor('btts', 'yes')}
                    onPress={() =>
                      toggleLeg({ market: 'btts', pick: 'yes', label: 'Les deux marquent', odds: odds.bttsYes })
                    }
                  />
                  <OddButton
                    label="Non"
                    odd={odds.bttsNo}
                    selected={legs['btts']?.pick === 'no'}
                    disabled={disabledFor('btts', 'no')}
                    onPress={() =>
                      toggleLeg({ market: 'btts', pick: 'no', label: 'Pas les deux qui marquent', odds: odds.bttsNo })
                    }
                  />
                </View>

                <SectionHead title="Score exact" tag="optionnel" />
                <BrutalBox shadow={false} borderWidth={1} className="flex-row items-center justify-between rounded-2xl bg-card px-4 py-3">
                  <Stepper value={hg} onChange={(n) => updateExact(n, ag)} />
                  <Text className="font-display text-lg text-muted">
                    :
                  </Text>
                  <Stepper value={ag} onChange={(n) => updateExact(hg, n)} />
                  <Pressable
                    disabled={exactDisabled}
                    onPress={
                      exactDisabled
                        ? undefined
                        : () =>
                            exactOn
                              ? setLeg('exact_score', null)
                              : setLeg('exact_score', {
                                  market: 'exact_score',
                                  pick: `${hg}-${ag}`,
                                  label: `${hg} - ${ag}`,
                                  odds: exactOdd,
                                })
                    }
                    style={{
                      alignItems: 'center',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: exactOn ? '#F5F5F4' : 'rgba(255,255,255,0.1)',
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      backgroundColor: exactOn ? '#F5F5F4' : '#1C1C20',
                      opacity: exactDisabled ? 0.4 : 1,
                    }}
                  >
                    <Text
                      className="font-display text-[15px]"
                      style={{ color: exactOn ? '#0A0A0B' : '#FFFFFF' }}
                    >
                      {exactOdd.toFixed(2)}
                    </Text>
                    <Text
                      className="font-ui-medium text-[9px]"
                      style={{ color: exactOn ? '#0A0A0B' : '#FFFFFF' }}
                    >
                      {exactOn ? 'Retirer' : 'Ajouter'}
                    </Text>
                  </Pressable>
                </BrutalBox>

                {/* Buteur — Phase ultérieure (besoin des effectifs) */}
                <SectionHead title="Buteur du match" tag="bientôt" />
                <BrutalBox shadow={false} borderWidth={1} className="flex-row items-center gap-3 rounded-2xl bg-card px-4 py-3 opacity-60">
                  <View
                    style={{
                      height: 40,
                      width: 40,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 13,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.1)',
                      backgroundColor: '#1C1C20',
                    }}
                  >
                    <Ionicons name="football-outline" size={18} color="#A1A1AA" />
                  </View>
                  <Text className="flex-1 font-ui-semibold text-[12px] text-muted">
                    Le choix du buteur arrive bientôt
                  </Text>
                </BrutalBox>
              </>
            )}
          </ScrollView>
        )}

        {ready ? (
          <View className="border-t border-line px-5 pb-9 pt-4">
            <BrutalButton
              variant={selectedCount === 0 || !legality.ok ? 'ghost' : 'primary'}
              disabled={selectedCount === 0 || !legality.ok}
              onPress={() => router.push('/prono/slip')}
              label={
                selectedCount === 0
                  ? 'Choisis au moins un pari'
                  : !legality.ok
                    ? 'Combinaison impossible'
                    : `Valider · ${selectedCount} sélection${selectedCount > 1 ? 's' : ''}`
              }
            />
          </View>
        ) : null}
      </View>
    </ScreenBackground>
  );
}
