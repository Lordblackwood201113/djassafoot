import { useAuth } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ScreenBackground } from '@/components/ScreenBackground';
import { Button } from '@/components/ui/Button';
import { formatDay, formatTime } from '@/lib/format';

const TX_REASONS: Record<
  string,
  { label: string; icon: any; color: string }
> = {
  signup_bonus: { label: "Bonus d'inscription", icon: 'gift-outline', color: 'text-green' },
  daily_bonus: { label: 'Bonus quotidien', icon: 'flame-outline', color: 'text-green' },
  ad_reward: { label: 'Pub récompensée', icon: 'play-circle-outline', color: 'text-green' },
  referral: { label: 'Parrainage', icon: 'people-outline', color: 'text-green' },
  prediction_stake: { label: 'Mise prono', icon: 'arrow-forward-outline', color: 'text-muted' },
  prediction_win: { label: 'Prono gagné', icon: 'trophy-outline', color: 'text-green' },
};

export default function Profile() {
  const me = useQuery(api.users.current);
  const transactions = useQuery(api.flames.myTransactions);
  const claimBonus = useMutation(api.flames.claimDailyBonus);
  const { signOut } = useAuth();

  const [claiming, setClaiming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!me?.lastDailyBonusAt) {
      return;
    }
    const target = me.lastDailyBonusAt + 23 * 60 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft('');
      } else {
        const hrs = Math.floor(diff / (3600 * 1000));
        const mins = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
        const secs = Math.floor((diff % (60 * 1000)) / 1000);
        setTimeLeft(
          `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [me?.lastDailyBonusAt]);

  const handleClaimDaily = async () => {
    try {
      setClaiming(true);
      setErrorMsg('');
      await claimBonus();
    } catch (e: any) {
      setErrorMsg(e.message || 'Une erreur est survenue');
    } finally {
      setClaiming(false);
    }
  };

  const currentStreak = me?.streak ?? 0;
  const multiplier = Math.min(currentStreak + 1, 5);
  const nextClaimAmount = 100 * multiplier;
  const isClaimable = !me?.lastDailyBonusAt || !timeLeft;

  return (
    <ScreenBackground variant="app">
      <View className="flex-1">
        <AppHeader />
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Profil */}
          <View className="items-center py-6">
            <View className="relative">
              {me?.avatarUrl ? (
                <Image
                  source={{ uri: me.avatarUrl }}
                  className="h-20 w-20 rounded-full border-2 border-surface-2"
                />
              ) : (
                <Ionicons name="person-circle" size={80} color="#9AA4CC" />
              )}
              {currentStreak > 0 && (
                <View className="absolute -bottom-1 -right-1 flex-row items-center rounded-full bg-red px-2 py-0.5 border border-blue-bottom">
                  <Ionicons name="flame" size={12} color="#FFFFFF" />
                  <Text className="ml-0.5 font-display-bold text-[10px] text-white">
                    {currentStreak}
                  </Text>
                </View>
              )}
            </View>
            <Text className="mt-3 font-display-bold text-2xl text-white">
              {me?.username ?? 'Joueur'}
            </Text>
            <Text className="mt-0.5 font-ui text-sm text-muted">
              {me?.points.toLocaleString('fr-FR') ?? 0} points de classement
            </Text>
          </View>

          {/* Solde & Streak */}
          <View className="flex-row gap-3 mb-6">
            <View className="flex-1 flex-row items-center gap-3 rounded-2xl bg-surface px-4 py-3.5">
              <Ionicons name="flame" size={24} color="#E5342B" />
              <View>
                <Text className="font-display-bold text-xl text-white">
                  {me ? me.flames.toLocaleString('fr-FR') : '—'}
                </Text>
                <Text className="font-ui text-[11px] text-muted uppercase tracking-wider">
                  solde flammes
                </Text>
              </View>
            </View>
            <View className="flex-1 flex-row items-center gap-3 rounded-2xl bg-surface px-4 py-3.5">
              <Ionicons name="trending-up" size={24} color="#3FCB86" />
              <View>
                <Text className="font-display-bold text-xl text-white">
                  {currentStreak} j.
                </Text>
                <Text className="font-ui text-[11px] text-muted uppercase tracking-wider">
                  série en cours
                </Text>
              </View>
            </View>
          </View>

          {/* Card Bonus Quotidien */}
          <View className="rounded-2xl bg-surface p-4 mb-6 border border-white/[0.04]">
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-2">
                <Ionicons name="gift-outline" size={20} color="#E5342B" />
                <Text className="font-display-semibold text-[15px] text-white">
                  Bonus Quotidien
                </Text>
              </View>
              {currentStreak > 0 && (
                <Text className="font-ui-semibold text-[11px] text-green">
                  Série {currentStreak}x
                </Text>
              )}
            </View>
            <Text className="font-ui text-[13px] text-muted mb-4">
              {"Récupère ton bonus de flammes toutes les 24h. Ta série augmente tes récompenses (jusqu'à 5x soit 500 🔥)."}
            </Text>

            {/* Streak visual tracker */}
            <View className="flex-row gap-1.5 justify-between mb-4">
              {[1, 2, 3, 4, 5].map((s) => {
                const isActive = s <= currentStreak;
                const isNext = s === currentStreak + 1;
                return (
                  <View
                    key={s}
                    className={`flex-1 items-center py-2 rounded-xl border ${
                      isActive
                        ? 'border-green bg-green/10'
                        : isNext && isClaimable
                          ? 'border-red bg-red/10'
                          : 'border-white/[0.05] bg-surface-2'
                    }`}
                  >
                    <Ionicons
                      name="flame"
                      size={14}
                      color={isActive ? '#3FCB86' : isNext && isClaimable ? '#E5342B' : '#6B76A8'}
                    />
                    <Text
                      className={`mt-0.5 font-display-bold text-[10px] ${
                        isActive ? 'text-green' : isNext && isClaimable ? 'text-red' : 'text-muted'
                      }`}
                    >
                      +{100 * s}
                    </Text>
                  </View>
                );
              })}
            </View>

            {errorMsg ? (
              <Text className="text-red font-ui text-[12px] mb-3 text-center">
                {errorMsg}
              </Text>
            ) : null}

            {isClaimable ? (
              <Pressable
                disabled={claiming}
                onPress={handleClaimDaily}
                className="bg-red rounded-xl py-3 items-center justify-center flex-row gap-2 active:opacity-90"
              >
                {claiming ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                    <Text className="font-display-bold text-[14px] text-white">
                      Réclamer mon bonus (+{nextClaimAmount} 🔥)
                    </Text>
                  </>
                )}
              </Pressable>
            ) : (
              <View className="bg-surface-2 rounded-xl py-3 items-center justify-center flex-row gap-2">
                <Ionicons name="time-outline" size={16} color="#9AA4CC" />
                <Text className="font-ui-semibold text-[14px] text-muted">
                  Disponible dans {timeLeft}
                </Text>
              </View>
            )}
          </View>

          {/* Section Historique */}
          <Text className="font-display-bold text-[16px] text-white mb-3">
            Historique des transactions
          </Text>

          {transactions === undefined ? (
            <ActivityIndicator color="#E5342B" className="my-6" />
          ) : transactions.length === 0 ? (
            <View className="items-center py-8 rounded-2xl bg-surface/50 border border-dashed border-white/[0.08]">
              <Ionicons name="list" size={32} color="#6B76A8" />
              <Text className="mt-2 font-ui text-sm text-muted">
                Aucune transaction pour le moment.
              </Text>
            </View>
          ) : (
            <View className="rounded-2xl bg-surface border border-white/[0.04] overflow-hidden">
              {transactions.slice(0, 10).map((tx, idx) => {
                const info = TX_REASONS[tx.reason] || {
                  label: 'Autre',
                  icon: 'help-circle-outline',
                  color: 'text-white',
                };
                const isPositive = tx.amount > 0;
                return (
                  <View
                    key={tx._id}
                    className={`flex-row items-center justify-between px-4 py-3.5 ${
                      idx > 0 ? 'border-t border-white/[0.04]' : ''
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="h-9 w-9 items-center justify-center rounded-xl bg-surface-2">
                        <Ionicons name={info.icon} size={18} color={isPositive ? '#3FCB86' : '#9AA4CC'} />
                      </View>
                      <View>
                        <Text className="font-ui-semibold text-[13px] text-white">
                          {info.label}
                        </Text>
                        <Text className="font-ui text-[11px] text-muted mt-0.5">
                          {formatDay(tx.createdAt)} à {formatTime(tx.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <Text
                      className={`font-display-bold text-[14px] ${
                        isPositive ? 'text-green' : 'text-white'
                      }`}
                    >
                      {isPositive ? `+${tx.amount}` : tx.amount} 🔥
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Déconnexion */}
          <View className="mt-8">
            <Button
              label="Se déconnecter"
              variant="secondary"
              onPress={() => signOut()}
            />
          </View>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}
