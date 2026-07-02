import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { BetCard, type Bet } from '@/components/prono/BetCard';
import { ScreenBackground } from '@/components/ScreenBackground';
import { EVENTS, track } from '@/lib/analytics';
import { appOrigin, shareLink } from '@/lib/share';
import { usePronoDraft } from '@/store/pronoDraftStore';

// En-tête de résultat selon le statut du pari.
const HERO: Record<
  string,
  { title: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }
> = {
  won: { title: 'Prono gagné', icon: 'trophy', bg: '#151518', fg: '#6FA287' },
  lost: { title: 'Prono perdu', icon: 'close', bg: '#151518', fg: '#E5484D' },
  pending: { title: 'En attente', icon: 'hourglass', bg: '#151518', fg: '#A1A1AA' },
  void: { title: 'Prono annulé', icon: 'remove', bg: '#151518', fg: '#A1A1AA' },
};

export default function BetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bet = useQuery(api.bets.byId, id ? { id: id as Id<'bets'> } : 'skip') as Bet | null | undefined;
  const loadForEdit = usePronoDraft((s) => s.loadForEdit);
  const [now] = useState(() => Date.now());

  // On peut modifier un pari tant qu'il est en attente ET que le match n'a pas commencé.
  const canEdit =
    !!bet &&
    bet.status === 'pending' &&
    bet.match != null &&
    bet.match.status === 'scheduled' &&
    bet.match.kickoff > now;

  const startEdit = () => {
    if (!bet) return;
    loadForEdit({ _id: bet._id, matchId: bet.matchId, stake: bet.stake, legs: bet.legs });
    router.push(`/prono/${bet.matchId}`);
  };

  const status = bet?.status ?? 'pending';
  const hero = HERO[status] ?? HERO.pending;
  const payout = bet?.payout ?? bet?.potentialPayout ?? 0;
  const subtitle =
    status === 'won'
      ? `Tu gagnes +🪙${payout}`
      : status === 'lost'
        ? 'Dommage — retente ta chance !'
        : status === 'void'
          ? 'Pari remboursé'
          : `Gain potentiel : 🪙${payout}`;

  // Partage un LIEN vers la page /s/bet/:id qui s'« unfurl » avec une carte OG dynamique perso
  // (image générée côté serveur). Aucune capture d'écran côté utilisateur.
  const onShare = async () => {
    if (!bet) return;
    const m = bet.match;
    const message =
      status === 'won'
        ? `J'ai gagné +🪙${payout} sur ${m?.homeName ?? ''} - ${m?.awayName ?? ''} sur Djassa Foot ! 🔥`
        : 'Mon prono sur Djassa Foot 🪙';
    const outcome = await shareLink(message, `${appOrigin()}/s/bet/${id}`);
    track(EVENTS.resultShared, { betId: String(bet._id), status, outcome, platform: Platform.OS });
  };

  return (
    <ScreenBackground variant={status === 'won' ? 'success' : 'app'}>
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="px-4 pt-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/pronos'))}
            className="h-11 w-11 items-center justify-center rounded-[13px] border border-hairline bg-surface"
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </Pressable>
        </View>

        {bet === undefined ? (
          <Text className="mt-16 text-center font-ui-semibold text-sm text-muted">Chargement…</Text>
        ) : bet === null ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-center font-display text-base text-white">Pari introuvable</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* En-tête résultat */}
            <View className="items-center gap-4 pt-2">
              <BrutalBox
                className="h-24 w-24 items-center justify-center rounded-2xl"
                style={{ backgroundColor: hero.bg }}
              >
                <Ionicons name={hero.icon} size={48} color={hero.fg} />
              </BrutalBox>
              <View className="items-center gap-1.5">
                <Text className="text-center font-display text-3xl text-white">
                  {hero.title}
                </Text>
                <Text
                  className={`text-center font-ui-semibold text-[12px] ${
                    status === 'won' ? 'text-green' : status === 'lost' ? 'text-red' : 'text-muted'
                  }`}
                >
                  {subtitle}
                </Text>
              </View>
            </View>

            {/* Détail du combiné (drapeaux, résultat par pari, mise, gain) */}
            <BetCard bet={bet} />

            {canEdit ? (
              <BrutalButton variant="primary" label="Modifier mon pari" onPress={startEdit} />
            ) : null}
            <BrutalButton
              variant={canEdit ? 'light' : 'primary'}
              label={status === 'won' ? 'Partager ma victoire' : 'Partager'}
              onPress={onShare}
            />
            <BrutalButton
              variant="ghost"
              label="Voir tous mes pronos"
              onPress={() => router.replace('/pronos')}
            />
          </ScrollView>
        )}
      </View>
    </ScreenBackground>
  );
}
