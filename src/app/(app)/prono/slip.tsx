import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameBalance } from '@/components/FlameBalance';
import { ScreenBackground } from '@/components/ScreenBackground';
import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { EVENTS, track } from '@/lib/analytics';
import { hardShadow } from '@/lib/brutal';
import { frTeam } from '@/lib/teamNames';
import { usePronoDraft } from '@/store/pronoDraftStore';

const MARKET_LABEL: Record<string, string> = {
  result_1x2: 'RÉSULTAT',
  over_under_2_5: 'NOMBRE DE BUTS',
  btts: 'LES DEUX MARQUENT',
  exact_score: 'SCORE EXACT',
};

export default function BetSlip() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { matchId, legs, stake, setStake, removeLeg } = usePronoDraft();
  const match = useQuery(api.matches.byId, matchId ? { id: matchId as Id<'matches'> } : 'skip');
  const me = useQuery(api.users.current);
  const place = useMutation(api.bets.place);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const legsArr = Object.values(legs);
  const totalOdds = useMemo(
    () => Math.round(legsArr.reduce((p, l) => p * l.odds, 1) * 100) / 100,
    [legsArr],
  );
  const balance = me?.flames ?? 0;
  const payout = Math.round(stake * totalOdds);
  const canValidate = legsArr.length > 0 && stake > 0 && stake <= balance && !busy;

  const chips = [100, 500, 1000];

  const submit = async () => {
    if (!matchId || !canValidate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await place({
        matchId: matchId as Id<'matches'>,
        stake,
        legs: legsArr.map((l) => ({ market: l.market, pick: l.pick, label: l.label })),
      });
      track(EVENTS.predictionPlaced, {
        matchId: matchId as string,
        stake,
        legs: legsArr.length,
        totalOdds,
        potentialPayout: res.potentialPayout,
      });
      router.replace(
        `/prono/confirmed?odds=${res.totalOdds}&payout=${res.potentialPayout}&stake=${stake}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la pose du pari');
      setBusy(false);
    }
  };

  return (
    <ScreenBackground variant="app">
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between px-4 pb-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
            className="h-10 w-10 items-center justify-center rounded-none border-2 border-white bg-surface-3"
            style={hardShadow('#E5342B', 3)}
          >
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </Pressable>
          <Text className="font-display text-lg uppercase text-white" style={{ letterSpacing: 0.5 }}>
            Mon pari
          </Text>
          <FlameBalance />
        </View>

        {match ? (
          <View className="flex-row items-center justify-center gap-2 px-5 pb-1">
            <View className="h-2.5 w-2.5 bg-red" />
            <Text className="text-center font-mono-bold text-[12px] uppercase text-muted" style={{ letterSpacing: 0.5 }}>
              {frTeam(match.homeName)} — {frTeam(match.awayName)}
            </Text>
          </View>
        ) : null}

        <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {/* Sélections */}
          <BrutalBox shadow="#E5342B" offset={6} borderWidth={2} className="mt-3 bg-surface-3 px-4 py-1">
            {legsArr.length === 0 ? (
              <Text className="py-6 text-center font-mono text-[12px] uppercase text-muted">
                Aucune sélection.
              </Text>
            ) : (
              legsArr.map((l, i) => (
                <View
                  key={l.market}
                  className={`flex-row items-center py-3 ${i > 0 ? 'border-t-2 border-white/20' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="font-mono text-[10px] uppercase text-muted" style={{ letterSpacing: 1 }}>
                      {MARKET_LABEL[l.market]}
                    </Text>
                    <Text className="mt-1 font-mono-bold text-[13px] uppercase text-white">{l.label}</Text>
                  </View>
                  <Text className="mr-3 font-display text-[15px] text-white">{l.odds.toFixed(2)}</Text>
                  <Pressable
                    onPress={() => removeLeg(l.market)}
                    className="h-7 w-7 items-center justify-center rounded-none border-2 border-white bg-ink"
                  >
                    <Ionicons name="close" size={14} color="#E5342B" />
                  </Pressable>
                </View>
              ))
            )}
          </BrutalBox>

          {/* Cote totale */}
          <View className="mt-4 flex-row items-center justify-between px-1">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 bg-red" />
              <Text className="font-mono-bold text-[12px] uppercase text-muted" style={{ letterSpacing: 0.5 }}>
                Cote totale
              </Text>
            </View>
            <Text className="font-display text-2xl text-red">{totalOdds.toFixed(2)}</Text>
          </View>

          {/* Mise */}
          <BrutalBox shadow={false} borderWidth={2} className="mt-4 bg-surface-3 px-4 py-4">
            <Text className="font-mono-bold text-[11px] uppercase text-muted" style={{ letterSpacing: 1 }}>
              Ta mise
            </Text>
            <View className="mt-1 flex-row items-baseline gap-2">
              <Text className="font-display text-4xl text-white">🪙 {stake}</Text>
              <Text className="font-mono text-[11px] uppercase text-muted">jetons</Text>
            </View>
            <View className="mt-4 flex-row gap-2">
              {chips.map((c) => {
                const active = stake === c;
                const locked = c > balance;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setStake(c)}
                    disabled={locked}
                    className={`flex-1 items-center rounded-none border-2 border-white py-2.5 ${
                      active ? 'bg-red' : locked ? 'bg-ink opacity-40' : 'bg-ink'
                    }`}
                  >
                    <Text className="font-mono-bold text-[13px] uppercase text-white">{c}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setStake(balance)}
                className={`flex-1 items-center rounded-none border-2 border-white py-2.5 ${
                  stake === balance && balance > 0 ? 'bg-red' : 'bg-ink'
                }`}
              >
                <Text className="font-mono-bold text-[13px] uppercase text-white">Max</Text>
              </Pressable>
            </View>
            <Text className="mt-3 font-mono text-[11px] uppercase text-muted">Solde : 🪙 {balance}</Text>
          </BrutalBox>

          {/* Gain potentiel */}
          <BrutalBox shadow="#3FCB86" offset={6} borderWidth={2} className="mt-4 flex-row items-center justify-between bg-surface-3 px-4 py-3">
            <Text className="font-mono-bold text-[12px] uppercase text-white" style={{ letterSpacing: 0.5 }}>
              Gain potentiel
            </Text>
            <Text className="font-display text-2xl text-green">🪙 {payout}</Text>
          </BrutalBox>

          {error ? (
            <Text className="mt-4 text-center font-mono-bold text-[12px] uppercase text-red">{error}</Text>
          ) : null}
        </ScrollView>

        <View className="px-5 pb-9 pt-2">
          <BrutalButton
            variant="primary"
            disabled={!canValidate}
            onPress={submit}
            label={
              busy
                ? 'Validation…'
                : stake > balance
                  ? 'Solde insuffisant'
                  : `Valider mon pari · ${stake} 🪙`
            }
          />
        </View>
      </View>
    </ScreenBackground>
  );
}
