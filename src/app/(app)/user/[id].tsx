import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { BetCard, type Bet } from '@/components/prono/BetCard';
import { ScreenBackground } from '@/components/ScreenBackground';

function initials(name?: string) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/).filter(Boolean);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.trim().slice(0, 2)).toUpperCase();
}

// Libellé + variante du bouton d'amitié selon la relation.
const FRIEND_BTN: Record<string, { label: string; variant: 'primary' | 'green' | 'ghost'; act: boolean }> = {
  none: { label: 'Ajouter en ami', variant: 'primary', act: true },
  pending_sent: { label: 'Demande envoyée', variant: 'ghost', act: false },
  pending_received: { label: "Accepter la demande", variant: 'green', act: true },
  accepted: { label: '✓ Amis', variant: 'ghost', act: false },
};

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useQuery(api.users.publicProfile, id ? { userId: id as Id<'users'> } : 'skip');
  const bets = useQuery(api.bets.forUser, id ? { userId: id as Id<'users'> } : 'skip') as
    | Bet[]
    | undefined;
  const sendRequest = useMutation(api.friends.sendRequest);
  const acceptRequest = useMutation(api.friends.acceptRequest);
  const [busy, setBusy] = useState(false);

  const onFriendAction = async () => {
    if (!profile || profile.isMe) return;
    setBusy(true);
    try {
      if (profile.relationship === 'none') {
        await sendRequest({ friendId: profile._id });
      } else if (profile.relationship === 'pending_received' && profile.relationshipId) {
        await acceptRequest({ relationshipId: profile.relationshipId as Id<'friends'> });
      }
    } catch {
      /* déjà en relation / erreur — ignoré ici */
    } finally {
      setBusy(false);
    }
  };

  const btn = profile ? FRIEND_BTN[profile.relationship] : undefined;

  return (
    <ScreenBackground variant="app">
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="px-4 pt-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/leaderboard'))}
            className="h-11 w-11 items-center justify-center rounded-[13px] border border-hairline bg-surface"
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </Pressable>
        </View>

        {profile === undefined ? (
          <ActivityIndicator color="#A1A1AA" className="my-16" />
        ) : profile === null ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-center font-display text-base text-white">
              Joueur introuvable
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Carte profil */}
            <BrutalBox className="items-center gap-3 rounded-2xl border border-hairline bg-surface-3 p-5">
              <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-surface-2">
                {profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={{ width: 80, height: 80 }} />
                ) : (
                  <Text className="font-display text-2xl text-white">{initials(profile.username)}</Text>
                )}
              </View>
              <Text numberOfLines={1} className="text-center font-display text-2xl text-white">
                {profile.username}
                {profile.isMe ? ' · Toi' : ''}
              </Text>

              {/* Stats */}
              <View className="mt-1 flex-row items-stretch gap-2.5">
                <Stat label="Jetons" value={`🪙 ${profile.flames.toLocaleString('fr-FR')}`} color="#FFFFFF" />
                <Stat label="Pronos" value={`${profile.betCount}`} color="#A1A1AA" />
                <Stat label="Gagnés" value={`${profile.wonCount}`} color="#6FA287" />
              </View>

              {/* Bouton d'amitié (pas pour soi-même) */}
              {!profile.isMe && btn ? (
                <View className="mt-2 w-full">
                  <BrutalButton
                    label={btn.label}
                    variant={btn.variant}
                    onPress={btn.act ? onFriendAction : undefined}
                    disabled={!btn.act}
                    loading={busy}
                  />
                </View>
              ) : null}
            </BrutalBox>

            {/* Ses pronos */}
            <View className="flex-row items-center gap-2 pt-1">
              <Text className="font-display text-base text-white">Ses pronos</Text>
            </View>

            {bets === undefined ? (
              <ActivityIndicator color="#A1A1AA" className="my-8" />
            ) : bets.length === 0 ? (
              <Text className="py-6 text-center font-ui-medium text-xs text-muted">
                Aucun prono pour le moment.
              </Text>
            ) : (
              // La carte contient déjà tout le pari ; pas de navigation (l'écran détail
              // /bet est réservé à SES propres paris).
              bets.map((b) => <BetCard key={b._id} bet={b} />)
            )}
          </ScrollView>
        )}
      </View>
    </ScreenBackground>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="items-center rounded-2xl border border-hairline bg-surface-2 px-3 py-2">
      <Text className="font-display text-[15px]" style={{ color }}>
        {value}
      </Text>
      <Text className="mt-0.5 font-ui-medium text-[9px] text-muted">{label}</Text>
    </View>
  );
}
