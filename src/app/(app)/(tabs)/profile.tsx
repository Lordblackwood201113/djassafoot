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
  signup_bonus: 'BONUS INSCRIPTION',
  daily_bonus: 'BONUS QUOTIDIEN',
  ad_reward: 'PUB RÉCOMPENSÉE',
  referral: 'PARRAINAGE',
  prediction_stake: 'MISE PRONO',
  prediction_win: 'PRONO GAGNÉ',
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
          <BrutalBox shadow="#E5342B" offset={6} borderWidth={2.5} className="flex-row items-center gap-3.5 bg-surface-3 p-4">
            <View
              className="h-[74px] w-[74px] items-center justify-center overflow-hidden border-2 border-white bg-surface-2"
              style={{ borderRadius: 0 }}
            >
              {me?.avatarUrl ? (
                <Image source={{ uri: me.avatarUrl }} style={{ width: 74, height: 74 }} contentFit="cover" />
              ) : (
                <Text className="font-display text-[28px] text-white">{initials(me?.username)}</Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="font-mono-bold text-[10px] text-muted" style={{ letterSpacing: 2 }}>
                JOUEUR
              </Text>
              <Text numberOfLines={1} className="mt-1 font-display text-[22px] uppercase text-white">
                {me?.username ?? 'Joueur'}
              </Text>
              <Text className="mt-1.5 font-mono text-[10px] text-muted" style={{ letterSpacing: 1 }}>
                {me?.username ? `@${me.username.toLowerCase().replace(/\s+/g, '')}` : ''}
              </Text>
            </View>
          </BrutalBox>

          {/* Stats */}
          <View className="flex-row gap-3">
            <BrutalBox shadow="#E5342B" className="flex-1 gap-1 bg-surface p-3.5">
              <Text className="font-mono-bold text-[10px] text-muted" style={{ letterSpacing: 1.5 }}>
                🪙 SOLDE
              </Text>
              <Text className="font-display text-[34px] text-white">
                {me ? me.flames.toLocaleString('fr-FR') : '—'}
              </Text>
              <Text className="font-mono text-[10px] text-muted">JETONS</Text>
            </BrutalBox>
            <BrutalBox shadow="#3FCB86" className="flex-1 gap-1 bg-surface p-3.5">
              <Text className="font-mono-bold text-[10px] text-muted" style={{ letterSpacing: 1.5 }}>
                ↗ SÉRIE
              </Text>
              <Text className="font-display text-[34px] text-green">{currentStreak}</Text>
              <Text className="font-mono text-[10px] text-muted">JOURS</Text>
            </BrutalBox>
          </View>

          {/* Bonus quotidien */}
          <BrutalBox shadow="#E5342B" offset={6} borderWidth={2.5} className="gap-3.5 bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-mono-bold text-[12px] text-white" style={{ letterSpacing: 1 }}>
                BONUS QUOTIDIEN
              </Text>
              <Text className="font-mono text-[11px] text-muted">/ 24H</Text>
            </View>
            <Text className="font-mono text-[12px] leading-[17px] text-muted">
              RÉCUPÈRE +20 JETONS TOUTES LES 24H. REVIENS CHAQUE JOUR POUR GARDER TA SÉRIE.
            </Text>
            {errorMsg ? (
              <Text className="font-mono text-[11px] text-red">{errorMsg.toUpperCase()}</Text>
            ) : null}
            {isClaimable ? (
              <BrutalButton
                label={claiming ? 'PATIENTE…' : 'RÉCLAMER +20 🪙'}
                variant="primary"
                disabled={claiming}
                onPress={handleClaim}
              />
            ) : (
              <View
                className="flex-row items-center justify-center gap-2 border-2 border-white bg-surface-3 py-3.5"
                style={{ borderRadius: 0 }}
              >
                <Ionicons name="time-outline" size={15} color="#9AA4CC" />
                <Text className="font-mono-bold text-[13px] text-muted">DISPONIBLE DANS {timeLeft}</Text>
              </View>
            )}
          </BrutalBox>

          {/* Historique */}
          <View>
            <View className="mb-2 flex-row items-end justify-between">
              <Text className="font-display text-[16px] text-white" style={{ letterSpacing: 1 }}>
                HISTORIQUE
              </Text>
              <Text className="font-mono text-[10px] text-muted">
                {transactions ? `${transactions.length} OPÉRATIONS` : '…'}
              </Text>
            </View>
            <View className="h-[2.5px] bg-white" />
            {transactions === undefined ? (
              <ActivityIndicator color="#E5342B" className="my-6" />
            ) : transactions.length === 0 ? (
              <Text className="py-6 text-center font-mono text-[12px] text-muted">
                AUCUNE OPÉRATION.
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
                    className="flex-row items-center justify-between py-3"
                    style={i > 0 ? { borderTopWidth: 1.5, borderColor: 'rgba(255,255,255,0.10)' } : undefined}
                  >
                    <View className="flex-row items-center gap-2.5">
                      <View
                        style={{ width: 9, height: 9, borderRadius: 0, backgroundColor: pos ? '#3FCB86' : '#6B76A8' }}
                      />
                      <View>
                        <Text className="font-mono-bold text-[12px] text-white">
                          {TX_LABEL[tx.reason] ?? 'AUTRE'}
                        </Text>
                        <Text className="font-mono text-[10px] text-muted">
                          {formatDay(tx.createdAt).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <Text className="font-mono-bold text-[13px]" style={{ color: pos ? '#3FCB86' : '#FFFFFF' }}>
                        {pos ? '+' : ''}
                        {tx.amount} 🪙
                      </Text>
                      {betId ? <Ionicons name="chevron-forward" size={14} color="#6B76A8" /> : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Déconnexion */}
          <View className="mt-2">
            <BrutalButton label="SE DÉCONNECTER" variant="ghost" onPress={() => signOut()} />
          </View>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}
