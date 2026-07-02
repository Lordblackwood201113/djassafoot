import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { validateLegs } from '@convex/betRules';
import { exactOdds } from '@convex/oddsShared';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameBalance } from '@/components/FlameBalance';
import { ScreenBackground } from '@/components/ScreenBackground';
import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { BrutalSlider } from '@/components/brutal/BrutalSlider';
import { EVENTS, track } from '@/lib/analytics';
import { frTeam } from '@/lib/teamNames';
import { usePronoDraft, type Leg } from '@/store/pronoDraftStore';

const MARKET_LABEL: Record<string, string> = {
  result_1x2: 'Résultat',
  over_under_2_5: 'Nombre de buts',
  btts: 'Les deux marquent',
  exact_score: 'Score exact',
};

export default function BetSlip() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { matchId, legs, stake, setStake, removeLeg, editingBetId, originalStake } = usePronoDraft();
  const match = useQuery(api.matches.byId, matchId ? { id: matchId as Id<'matches'> } : 'skip');
  const me = useQuery(api.users.current);
  const place = useMutation(api.bets.place);
  const update = useMutation(api.bets.update);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cotes fraîches du match : le serveur re-price au moment de valider, donc on affiche les cotes
  // actuelles (indispensable en édition, où les cotes stockées peuvent avoir bougé). Fallback sur
  // la cote stockée tant que la requête charge.
  const oddsData = useQuery(
    api.bets.oddsForMatch,
    matchId ? { matchId: matchId as Id<'matches'> } : 'skip',
  );
  const oddOf = (l: Leg): number => {
    if (!oddsData) return l.odds;
    switch (l.market) {
      case 'result_1x2':
        return l.pick === 'home' ? oddsData.home : l.pick === 'away' ? oddsData.away : oddsData.draw;
      case 'over_under_2_5':
        return l.pick === 'over' ? oddsData.over : oddsData.under;
      case 'btts':
        return l.pick === 'yes' ? oddsData.bttsYes : oddsData.bttsNo;
      case 'exact_score': {
        const [h, a] = l.pick.split('-').map((n) => parseInt(n, 10));
        return exactOdds(oddsData.lambdas, h || 0, a || 0);
      }
      default:
        return l.odds;
    }
  };

  const legsArr = Object.values(legs);
  const totalOdds = Math.round(legsArr.reduce((p, l) => p * oddOf(l), 1) * 100) / 100;
  const balance = me?.flames ?? 0;
  // En édition, l'ancienne mise est remboursée → elle s'ajoute au solde réellement disponible.
  const spendable = balance + (editingBetId ? originalStake : 0);
  const payout = Math.round(stake * totalOdds);
  // Anti-paris-illégaux : la combinaison doit être logiquement possible (miroir du serveur).
  const legality = validateLegs(legsArr.map((l) => ({ market: l.market, pick: l.pick })));
  const canValidate =
    legsArr.length > 0 && stake > 0 && stake <= spendable && legality.ok && !busy;

  const submit = async () => {
    if (!matchId || !canValidate) return;
    setBusy(true);
    setError(null);
    try {
      const legsPayload = legsArr.map((l) => ({ market: l.market, pick: l.pick, label: l.label }));
      const res = editingBetId
        ? await update({ betId: editingBetId as Id<'bets'>, stake, legs: legsPayload })
        : await place({ matchId: matchId as Id<'matches'>, stake, legs: legsPayload });
      track(editingBetId ? EVENTS.predictionEdited : EVENTS.predictionPlaced, {
        matchId: matchId as string,
        stake,
        legs: legsArr.length,
        totalOdds,
        potentialPayout: res.potentialPayout,
      });
      router.replace(
        `/prono/confirmed?odds=${res.totalOdds}&payout=${res.potentialPayout}&stake=${stake}${editingBetId ? '&edited=1' : ''}`,
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
            className="h-10 w-10 items-center justify-center rounded-[13px] border border-hairline bg-surface-2"
          >
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </Pressable>
          <Text className="font-display text-lg text-white">
            {editingBetId ? 'Modifier mon pari' : 'Mon pari'}
          </Text>
          <FlameBalance />
        </View>

        {match ? (
          <View className="flex-row items-center justify-center gap-2 px-5 pb-1">
            <Text className="text-center font-ui-semibold text-[12px] text-muted">
              {frTeam(match.homeName)} — {frTeam(match.awayName)}
            </Text>
          </View>
        ) : null}

        <ScrollView className="px-5" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {/* Sélections */}
          <BrutalBox shadow={false} borderWidth={1} className="mt-3 rounded-2xl border-hairline bg-card px-4 py-1">
            {legsArr.length === 0 ? (
              <Text className="py-6 text-center font-ui-medium text-[12px] text-muted">
                Aucune sélection.
              </Text>
            ) : (
              legsArr.map((l, i) => (
                <View
                  key={l.market}
                  className={`flex-row items-center py-3 ${i > 0 ? 'border-t border-line' : ''}`}
                >
                  <View className="flex-1">
                    <Text className="font-ui-medium text-[10px] text-muted">
                      {MARKET_LABEL[l.market]}
                    </Text>
                    <Text className="mt-1 font-ui-semibold text-[13px] text-white">{l.label}</Text>
                  </View>
                  <Text className="mr-3 font-display text-[15px] text-white">{oddOf(l).toFixed(2)}</Text>
                  <Pressable
                    onPress={() => removeLeg(l.market)}
                    className="h-7 w-7 items-center justify-center rounded-[13px] border border-hairline bg-surface-2"
                  >
                    <Ionicons name="close" size={14} color="#A1A1AA" />
                  </Pressable>
                </View>
              ))
            )}
          </BrutalBox>

          {/* Cote totale */}
          <View className="mt-4 flex-row items-center justify-between px-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-ui-semibold text-[12px] text-muted">
                Cote totale
              </Text>
            </View>
            <Text className="font-display text-2xl text-white">{totalOdds.toFixed(2)}</Text>
          </View>

          {/* Mise — libre + slider (jetons entiers) */}
          <BrutalBox shadow={false} borderWidth={1} className="mt-4 rounded-2xl border-hairline bg-card px-4 py-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-ui-semibold text-[11px] text-muted">
                Ta mise
              </Text>
              <Text className="font-ui-medium text-[11px] text-muted">
                {editingBetId ? `Dispo : 🪙 ${spendable}` : `Solde : 🪙 ${balance}`}
              </Text>
            </View>

            <View className="mt-2 flex-row items-center gap-2">
              <Text className="font-display text-3xl text-white">🪙</Text>
              <TextInput
                value={stake ? String(stake) : ''}
                onChangeText={(t) => {
                  const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
                  setStake(Math.min(spendable, Number.isFinite(n) ? n : 0));
                }}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#6B7280"
                className="flex-1 rounded-xl border border-hairline bg-surface-2 px-3 py-2 font-display text-3xl text-white"
                style={{ minWidth: 0 }}
              />
              <Pressable
                onPress={() => setStake(spendable)}
                className="items-center justify-center rounded-xl border border-hairline bg-surface-2 px-4 py-3"
              >
                <Text className="font-ui-semibold text-[12px] text-white">Max</Text>
              </Pressable>
            </View>

            <View className="mt-4">
              <BrutalSlider value={Math.min(stake, spendable)} min={0} max={Math.max(1, spendable)} onChange={setStake} />
            </View>
          </BrutalBox>

          {/* Gain potentiel */}
          <BrutalBox shadow={false} borderWidth={1} className="mt-4 flex-row items-center justify-between rounded-2xl border-hairline bg-card px-4 py-3">
            <Text className="font-ui-semibold text-[12px] text-white">
              Gain potentiel
            </Text>
            <Text className="font-display text-2xl text-green">🪙 {payout}</Text>
          </BrutalBox>

          {!legality.ok && legsArr.length > 0 ? (
            <Text className="mt-4 text-center font-ui-semibold text-[12px] text-red">
              {legality.reason}
            </Text>
          ) : null}
          {error ? (
            <Text className="mt-4 text-center font-ui-semibold text-[12px] text-red">{error}</Text>
          ) : null}
        </ScrollView>

        <View className="px-5 pb-9 pt-2">
          <BrutalButton
            variant="primary"
            disabled={!canValidate}
            onPress={submit}
            label={
              busy
                ? editingBetId
                  ? 'Enregistrement…'
                  : 'Validation…'
                : !legality.ok && legsArr.length > 0
                  ? 'Combinaison invalide'
                  : stake > spendable
                    ? 'Solde insuffisant'
                    : editingBetId
                      ? `Enregistrer · ${stake} 🪙`
                      : `Valider mon pari · ${stake} 🪙`
            }
          />
        </View>
      </View>
    </ScreenBackground>
  );
}
