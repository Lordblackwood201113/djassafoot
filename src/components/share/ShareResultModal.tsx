import { useRef, useState } from 'react';
import { Modal, Platform, ScrollView, Text, View } from 'react-native';

import { BrutalButton } from '@/components/brutal/BrutalButton';
import { ShareCard } from '@/components/share/ShareCard';
import type { Bet } from '@/components/prono/BetCard';
import { EVENTS, track } from '@/lib/analytics';
import { appOrigin } from '@/lib/share';
import { captureCard, shareResultImage } from '@/lib/shareImage';

// Aperçu de la carte de partage + bouton « Partager » (image en un tap).
export function ShareResultModal({
  bet,
  username,
  visible,
  onClose,
}: {
  bet: Bet;
  username?: string | null;
  visible: boolean;
  onClose: () => void;
}) {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const onShare = async () => {
    if (busy) return;
    setBusy(true);
    setMsg('');
    try {
      const m = bet.match;
      const payout = bet.payout ?? bet.potentialPayout ?? 0;
      const score = m && (m.status === 'live' || m.status === 'finished') ? `${m.homeScore ?? 0}-${m.awayScore ?? 0}` : '';
      const message =
        bet.status === 'won'
          ? `J'ai gagné +🪙${payout} sur ${m?.homeName ?? ''} ${score} ${m?.awayName ?? ''} sur Djassa Foot ! 🔥`
          : 'Mon prono sur Djassa Foot 🪙';
      const url = appOrigin();

      const captured = await captureCard(cardRef);
      const outcome = await shareResultImage(captured, { message, url });
      track(EVENTS.resultShared, {
        betId: String(bet._id),
        status: bet.status,
        outcome,
        platform: Platform.OS,
      });
      setMsg(
        outcome === 'downloaded'
          ? 'Image téléchargée ✅'
          : outcome === 'copied'
            ? 'Lien copié ✅'
            : outcome === 'manual'
              ? 'Copie le lien pour partager'
              : '', // 'shared' | 'cancelled' → aucun message
      );
      if (outcome === 'shared') onClose(); // 'cancelled' → on reste sur l'aperçu, sans rien faire
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <ScrollView
        className="flex-1 bg-black/80"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <ShareCard ref={cardRef} bet={bet} username={username} />
        <View className="mt-6 w-[340px] gap-2.5">
          <BrutalButton label={busy ? 'Partage…' : 'Partager'} variant="primary" onPress={onShare} loading={busy} />
          <BrutalButton label="Fermer" variant="ghost" onPress={onClose} />
          {msg ? <Text className="text-center font-ui-semibold text-[12px] text-green">{msg}</Text> : null}
        </View>
      </ScrollView>
    </Modal>
  );
}
