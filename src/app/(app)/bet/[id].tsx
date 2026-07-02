import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { BetCard, type Bet } from '@/components/prono/BetCard';
import { ScreenBackground } from '@/components/ScreenBackground';
import { ShareCard } from '@/components/share/ShareCard';
import { EVENTS, track } from '@/lib/analytics';
import { uploadToConvex } from '@/lib/leagueLogo';
import { captureCardBlob } from '@/lib/shareCard';
import { appOrigin, shareLink } from '@/lib/share';
import { usePronoDraft } from '@/store/pronoDraftStore';

type BetWithShare = Bet & { shareImageUrl?: string | null };

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
  const bet = useQuery(api.bets.byId, id ? { id: id as Id<'bets'> } : 'skip') as
    | BetWithShare
    | null
    | undefined;
  const loadForEdit = usePronoDraft((s) => s.loadForEdit);
  const [now] = useState(() => Date.now());
  const me = useQuery(api.users.current);
  const genShareUrl = useMutation(api.bets.generateShareUploadUrl);
  const setShareImage = useMutation(api.bets.setShareImage);
  const cardRef = useRef<View>(null);
  const genDone = useRef(false);

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

  const cancelBet = useMutation(api.bets.cancel);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const doCancel = async () => {
    if (!bet) return;
    setCanceling(true);
    setCancelError(null);
    try {
      await cancelBet({ betId: bet._id });
      router.replace('/pronos');
    } catch (e) {
      setCancelError(e instanceof Error ? e.message : 'Erreur lors de l’annulation');
      setCanceling(false);
    }
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

  // Génère UNE fois la carte de partage d'un pari réglé (si pas déjà stockée) : capture hors-écran
  // → upload Convex → l'URL sert d'image OG du lien /s/bet/:id (unfurl WhatsApp/FB/X).
  const needsImage = !!bet && (status === 'won' || status === 'lost') && !bet.shareImageUrl;
  useEffect(() => {
    if (!bet || !needsImage || genDone.current) return;
    genDone.current = true;
    const t = setTimeout(async () => {
      try {
        const blob = await captureCardBlob(cardRef);
        if (!blob) return;
        const url = await genShareUrl();
        const storageId = await uploadToConvex(url, blob);
        await setShareImage({ betId: bet._id, storageId: storageId as Id<'_storage'> });
      } catch {
        /* silencieux : le lien retombera sur l'image générique */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [bet, needsImage, genShareUrl, setShareImage]);

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
              <>
                <BrutalButton variant="primary" label="Modifier mon pari" onPress={startEdit} />
                {confirmCancel ? (
                  <View className="gap-2 rounded-2xl border border-hairline bg-card p-4">
                    <Text className="text-center font-ui-medium text-[12px] text-muted">
                      Ta mise de 🪙{bet.stake} te sera remboursée. Annuler ce pari ?
                    </Text>
                    {cancelError ? (
                      <Text className="text-center font-ui-semibold text-[12px] text-red">{cancelError}</Text>
                    ) : null}
                    <BrutalButton
                      variant="primary"
                      loading={canceling}
                      label="Oui, annuler mon pari"
                      onPress={doCancel}
                    />
                    <BrutalButton variant="ghost" label="Non, garder" onPress={() => setConfirmCancel(false)} />
                  </View>
                ) : (
                  <BrutalButton variant="ghost" label="Annuler le pari" onPress={() => setConfirmCancel(true)} />
                )}
              </>
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

        {/* Carte de partage rendue hors-écran (cible de capture pour l'image OG). */}
        {needsImage && bet ? (
          <View style={{ position: 'absolute', left: -10000, top: 0 }} pointerEvents="none">
            <ShareCard ref={cardRef} bet={bet} username={me?.username} />
          </View>
        ) : null}
      </View>
    </ScreenBackground>
  );
}
