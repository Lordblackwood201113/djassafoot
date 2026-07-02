import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { ScreenBackground } from '@/components/ScreenBackground';
import { EVENTS, track } from '@/lib/analytics';
import { formatDay } from '@/lib/format';

const TX_LABEL: Record<string, string> = {
  signup_bonus: 'Bonus inscription',
  daily_bonus: 'Bonus quotidien',
  ad_reward: 'Pub récompensée',
  referral: 'Parrainage',
  prediction_stake: 'Mise prono',
  prediction_win: 'Prono gagné',
};

function initials(name?: string) {
  if (!name) return 'JD';
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function Profile() {
  const me = useQuery(api.users.current);
  const transactions = useQuery(api.flames.myTransactions);
  const claimBonus = useMutation(api.flames.claimDailyBonus);
  const { signOut } = useAuth();
  const router = useRouter();

  const [claiming, setClaiming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!me?.lastDailyBonusAt) return;
    const target = me.lastDailyBonusAt + 23 * 60 * 60 * 1000;
    const tick = () => {
      const diff = target - Date.now();
      if (diff <= 0) return setTimeLeft('');
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`,
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [me?.lastDailyBonusAt]);

  const currentStreak = me?.streak ?? 0;
  const isClaimable = !me?.lastDailyBonusAt || !timeLeft;

  const handleClaim = async () => {
    try {
      setClaiming(true);
      setErrorMsg('');
      await claimBonus();
      track(EVENTS.dailyBonusClaimed, { amount: 20 });
    } catch (e: any) {
      setErrorMsg(e.message || 'Une erreur est survenue');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <ScreenBackground variant="app">
      <View className="flex-1">
        <AppHeader />
        <ScrollView
          className="flex-1 px-[18px]"
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 4, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Identité */}
          <BrutalBox className="flex-row items-center gap-3.5 rounded-2xl border border-hairline bg-surface-3 p-4">
            <View className="h-[74px] w-[74px] items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-surface-2">
              {me?.avatarUrl ? (
                <Image source={{ uri: me.avatarUrl }} style={{ width: 74, height: 74 }} contentFit="cover" />
              ) : (
                <Text className="font-display text-[28px] text-white">{initials(me?.username)}</Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="font-ui-semibold text-[10px] text-muted">
                Joueur
              </Text>
              <Text numberOfLines={1} className="mt-1 font-display text-[22px] text-white">
                {me?.username ?? 'Joueur'}
              </Text>
              <Text className="mt-1.5 font-ui-medium text-[10px] text-muted">
                {me?.username ? `@${me.username.toLowerCase().replace(/\s+/g, '')}` : ''}
              </Text>
            </View>
          </BrutalBox>

          {/* Stats */}
          <View className="flex-row gap-3">
            <BrutalBox className="flex-1 gap-1 rounded-2xl border border-hairline bg-surface p-3.5">
              <Text className="font-ui-semibold text-[10px] text-muted">
                🪙 Solde
              </Text>
              <Text className="font-display text-[34px] text-white">
                {me ? me.flames.toLocaleString('fr-FR') : '—'}
              </Text>
              <Text className="font-ui-medium text-[10px] text-muted">Jetons</Text>
            </BrutalBox>
            <BrutalBox className="flex-1 gap-1 rounded-2xl border border-hairline bg-surface p-3.5">
              <Text className="font-ui-semibold text-[10px] text-muted">
                ↗ Série
              </Text>
              <Text className="font-display text-[34px] text-green">{currentStreak}</Text>
              <Text className="font-ui-medium text-[10px] text-muted">Jours</Text>
            </BrutalBox>
          </View>

          {/* Bonus quotidien */}
          <BrutalBox className="gap-3.5 rounded-2xl border border-hairline bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-ui-semibold text-[12px] text-white">
                Bonus quotidien
              </Text>
              <Text className="font-ui-medium text-[11px] text-muted">/ 24h</Text>
            </View>
            <Text className="font-ui-medium text-[12px] leading-[17px] text-muted">
              Récupère +20 jetons toutes les 24h. Reviens chaque jour pour garder ta série.
            </Text>
            {errorMsg ? (
              <Text className="font-ui-medium text-[11px] text-red">{errorMsg}</Text>
            ) : null}
            {isClaimable ? (
              <BrutalButton
                label={claiming ? 'Patiente…' : 'Réclamer +20 🪙'}
                variant="primary"
                disabled={claiming}
                onPress={handleClaim}
              />
            ) : (
              <View className="flex-row items-center justify-center gap-2 rounded-xl border border-hairline bg-surface-3 py-3.5">
                <Ionicons name="time-outline" size={15} color="#A1A1AA" />
                <Text className="font-ui-semibold text-[13px] text-muted">Disponible dans {timeLeft}</Text>
              </View>
            )}
          </BrutalBox>

          {/* Historique */}
          <View>
            <View className="mb-2 flex-row items-end justify-between">
              <Text className="font-display text-[16px] text-white">
                Historique
              </Text>
              <Text className="font-ui-medium text-[10px] text-muted">
                {transactions ? `${transactions.length} opérations` : '…'}
              </Text>
            </View>
            <View className="rounded-2xl border border-hairline bg-card px-4">
              {transactions === undefined ? (
                <ActivityIndicator color="#A1A1AA" className="my-6" />
              ) : transactions.length === 0 ? (
                <Text className="py-6 text-center font-ui-medium text-[12px] text-muted">
                  Aucune opération.
                </Text>
              ) : (
                transactions.slice(0, 12).map((tx, i) => {
                  const pos = tx.amount > 0;
                  // Les lignes de pari (mise / gain) ouvrent le pari concerné via son refId.
                  const betId =
                    (tx.reason === 'prediction_stake' || tx.reason === 'prediction_win') && tx.refId
                      ? tx.refId
                      : undefined;
                  return (
                    <Pressable
                      key={tx._id}
                      onPress={betId ? () => router.push(`/bet/${betId}`) : undefined}
                      className={`flex-row items-center justify-between py-3 ${i > 0 ? 'border-t border-line' : ''}`}
                    >
                      <View className="flex-row items-center gap-2.5">
                        <View className="h-9 w-9 items-center justify-center rounded-full bg-surface-2">
                          <Ionicons
                            name={pos ? 'arrow-up' : 'arrow-down'}
                            size={15}
                            color={pos ? '#6FA287' : '#A1A1AA'}
                          />
                        </View>
                        <View>
                          <Text className="font-ui-semibold text-[12px] text-white">
                            {TX_LABEL[tx.reason] ?? 'Autre'}
                          </Text>
                          <Text className="font-ui-medium text-[10px] text-muted">
                            {formatDay(tx.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Text className="font-ui-semibold text-[13px]" style={{ color: pos ? '#6FA287' : '#A1A1AA' }}>
                          {pos ? '+' : ''}
                          {tx.amount} 🪙
                        </Text>
                        {betId ? <Ionicons name="chevron-forward" size={14} color="#6B7280" /> : null}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>

          {/* Déconnexion */}
          <View className="mt-2">
            <BrutalButton label="Se déconnecter" variant="ghost" onPress={() => signOut()} />
          </View>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}
