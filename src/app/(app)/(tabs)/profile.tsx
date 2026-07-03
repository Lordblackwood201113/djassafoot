import { useAuth, useUser } from '@clerk/expo';
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

const HISTORY_PREVIEW = 5;

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
  const deleteMyAccount = useMutation(api.users.deleteMyAccount);
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const [claiming, setClaiming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showAllTx, setShowAllTx] = useState(false);

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

  // Suppression définitive : on efface d'abord toutes les données Convex, puis le compte Clerk
  // (auth), puis on déconnecte → le layout renvoie vers l'accueil. Irréversible.
  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteMyAccount();
      try {
        await user?.delete();
      } catch {
        // La suppression Clerk peut échouer si l'auto-suppression n'est pas activée côté Clerk ;
        // les données sont déjà effacées → on déconnecte quand même.
      }
      await signOut();
      router.replace('/');
    } catch (e: any) {
      setDeleteError(e?.message || 'La suppression a échoué. Réessaie.');
      setDeleting(false);
    }
  };

  return (
    <ScreenBackground variant="app">
      <View className="flex-1">
        <AppHeader />

        {/* En-tête ANCRÉ : identité + solde + série restent visibles, ne défilent pas. */}
        <View className="gap-3.5 px-[18px] pb-4 pt-1">
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
        </View>

        {/* Contenu défilant : bonus, historique, compte. */}
        <ScrollView
          className="flex-1 px-[18px]"
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 0, gap: 16 }}
          showsVerticalScrollIndicator={false}
        >
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
                (showAllTx ? transactions : transactions.slice(0, HISTORY_PREVIEW)).map((tx, i) => {
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
              {transactions && transactions.length > HISTORY_PREVIEW ? (
                <Pressable
                  onPress={() => setShowAllTx((v) => !v)}
                  className="flex-row items-center justify-center gap-1.5 border-t border-line py-3.5"
                  accessibilityRole="button"
                >
                  <Text className="font-ui-semibold text-[12px] text-white">
                    {showAllTx ? 'Voir moins' : `Voir tout (${transactions.length})`}
                  </Text>
                  <Ionicons
                    name={showAllTx ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color="#F5F5F4"
                  />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Compte : comptes bloqués + déconnexion + suppression définitive */}
          <View className="mt-2 gap-3">
            <Pressable
              onPress={() => router.push('/blocked')}
              className="flex-row items-center justify-between rounded-2xl border border-hairline bg-surface px-4 py-3.5"
            >
              <View className="flex-row items-center gap-2.5">
                <Ionicons name="ban-outline" size={16} color="#A1A1AA" />
                <Text className="font-ui-semibold text-[13px] text-white">Comptes bloqués</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#6B7280" />
            </Pressable>
            <BrutalButton label="Se déconnecter" variant="ghost" onPress={() => signOut()} />

            {confirmDelete ? (
              <View className="gap-3 rounded-2xl border border-red/40 bg-surface p-4">
                <Text className="font-ui-semibold text-[13px] text-white">
                  Supprimer définitivement ton compte ?
                </Text>
                <Text className="font-ui-medium text-[12px] leading-[17px] text-muted">
                  Toutes tes données seront effacées sans possibilité de récupération : profil,
                  jetons, pronos, ligues et amis.
                </Text>
                {deleteError ? (
                  <Text className="font-ui-medium text-[11px] text-red">{deleteError}</Text>
                ) : null}
                <Pressable
                  onPress={handleDelete}
                  disabled={deleting}
                  className="items-center justify-center rounded-xl py-3.5"
                  style={{ backgroundColor: deleting ? '#1C1C20' : '#E5484D' }}
                >
                  <Text
                    className="font-display-bold text-[15px]"
                    style={{ color: deleting ? '#6B7280' : '#FFFFFF' }}
                  >
                    {deleting ? 'Suppression…' : 'Oui, supprimer mon compte'}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="items-center py-1"
                >
                  <Text className="font-ui-semibold text-[13px] text-muted">Annuler</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmDelete(true)} className="items-center py-1">
                <Text className="font-ui-semibold text-[13px] text-red">Supprimer mon compte</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}
