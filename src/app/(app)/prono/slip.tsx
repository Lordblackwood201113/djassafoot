import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { FlameBalance } from '@/components/FlameBalance';
import { ScreenBackground } from '@/components/ScreenBackground';
import { frTeam } from '@/lib/teamNames';
import { usePronoDraft } from '@/store/pronoDraftStore';

const MARKET_LABEL: Record<string, string> = {
  result_1x2: 'RÉSULTAT',
  over_under_2_5: 'NOMBRE DE BUTS',
  btts: 'LES DEUX MARQUENT',
  exact_score: 'SCORE EXACT',
};

export default function BetSlip() {
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
      <View className="flex-1 pt-12">
        <View className="flex-row items-center justify-between px-4 pb-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
            className="h-9 w-9 items-center justify-center rounded-2xl bg-surface"
          >
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </Pressable>
          <Text className="font-display-bold text-base text-white">Mon pari</Text>
          <FlameBalance />
        </View>

        {match ? (
          <Text className="px-5 pb-1 text-center font-ui-medium text-[13px] text-muted">
            {frTeam(match.homeName)} — {frTeam(match.awayName)}
          </Text>
        ) : null}

        <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {/* Sélections */}
          <View className="mt-2 rounded-2xl bg-surface px-4 py-1">
            {legsArr.length === 0 ? (
              <Text className="py-6 text-center font-ui text-sm text-muted">Aucune sélection.</Text>
            ) : (
              legsArr.map((l, i) => (
                <View
                  key={l.market}
                  className={`flex-row items-center py-3 ${i > 0 ? 'border-t border-white/[0.06]' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="font-ui-medium text-[10px] tracking-wide text-muted">
                      {MARKET_LABEL[l.market]}
                    </Text>
                    <Text className="mt-0.5 font-ui-semibold text-[14px] text-white">{l.label}</Text>
                  </View>
                  <Text className="mr-3 font-display-bold text-[15px] text-white">{l.odds.toFixed(2)}</Text>
                  <Pressable onPress={() => removeLeg(l.market)} className="h-7 w-7 items-center justify-center">
                    <Ionicons name="close" size={16} color="#9AA4CC" />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          {/* Cote totale */}
          <View className="mt-3 flex-row items-center justify-between px-1">
            <Text className="font-ui-medium text-[13px] text-muted">Cote totale</Text>
            <Text className="font-display-bold text-xl text-red">{totalOdds.toFixed(2)}</Text>
          </View>

          {/* Mise */}
          <View className="mt-4 rounded-2xl bg-surface px-4 py-4">
            <Text className="font-ui-medium text-[12px] text-muted">Ta mise</Text>
            <View className="mt-1 flex-row items-baseline gap-2">
              <Text className="font-display-bold text-3xl text-white">🔥 {stake}</Text>
              <Text className="font-ui text-sm text-muted">flammes</Text>
            </View>
            <View className="mt-3 flex-row gap-2">
              {chips.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setStake(c)}
                  disabled={c > balance}
                  className={`flex-1 items-center rounded-xl py-2 ${
                    stake === c ? 'bg-red' : c > balance ? 'bg-surface-2 opacity-40' : 'bg-surface-2'
                  }`}
                >
                  <Text className={`font-ui-semibold text-[13px] ${stake === c ? 'text-white' : 'text-white'}`}>
                    {c}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setStake(balance)}
                className={`flex-1 items-center rounded-xl py-2 ${stake === balance && balance > 0 ? 'bg-red' : 'bg-surface-2'}`}
              >
                <Text className="font-ui-semibold text-[13px] text-white">Max</Text>
              </Pressable>
            </View>
            <Text className="mt-2 font-ui text-[11px] text-muted">Solde : 🔥 {balance}</Text>
          </View>

          {/* Gain potentiel */}
          <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-green/30 bg-green/[0.10] px-4 py-3">
            <Text className="font-ui-medium text-[13px] text-white">Gain potentiel</Text>
            <Text className="font-display-bold text-xl text-green">🔥 {payout}</Text>
          </View>

          {error ? (
            <Text className="mt-3 text-center font-ui-medium text-[13px] text-red">{error}</Text>
          ) : null}
        </ScrollView>

        <View className="px-5 pb-9 pt-2">
          <Pressable
            disabled={!canValidate}
            onPress={submit}
            className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 ${canValidate ? 'bg-red' : 'bg-surface-2'}`}
          >
            <Text className={`font-display-bold text-[15px] ${canValidate ? 'text-white' : 'text-muted'}`}>
              {busy
                ? 'Validation…'
                : stake > balance
                  ? 'Solde insuffisant'
                  : `Valider mon pari · ${stake} 🔥`}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScreenBackground>
  );
}
