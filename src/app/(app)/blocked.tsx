import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/ScreenBackground';

function initials(name?: string) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/).filter(Boolean);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.trim().slice(0, 2)).toUpperCase();
}

// Écran de gestion des comptes bloqués (exigé par les stores : l'utilisateur doit pouvoir débloquer).
export default function BlockedAccounts() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const blocks = useQuery(api.moderation.myBlocks);
  const unblock = useMutation(api.moderation.unblock);
  const [busyId, setBusyId] = useState<string | null>(null);

  const onUnblock = async (userId: Id<'users'>) => {
    setBusyId(userId);
    try {
      await unblock({ userId });
    } catch {
      /* ignoré */
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScreenBackground variant="app">
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center gap-3 px-4 pb-1 pt-1">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
            className="h-11 w-11 items-center justify-center rounded-[13px] border border-hairline bg-surface-2"
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </Pressable>
          <Text className="font-display text-xl text-white">Comptes bloqués</Text>
        </View>

        {blocks === undefined ? (
          <ActivityIndicator color="#A1A1AA" className="my-16" />
        ) : blocks.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Ionicons name="shield-checkmark-outline" size={34} color="#6B7280" />
            <Text className="mt-3 text-center font-ui-medium text-[13px] text-muted">
              Tu n&apos;as bloqué personne.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 12, paddingBottom: 40, gap: 10 }}
            showsVerticalScrollIndicator={false}
          >
            <Text className="font-ui-medium text-[12px] leading-[17px] text-muted">
              Ces joueurs n&apos;apparaissent plus dans tes classements ni ta recherche, et ne peuvent
              pas t&apos;ajouter. Débloque pour rétablir.
            </Text>
            {blocks.map((b) => (
              <View
                key={b.blockId}
                className="flex-row items-center gap-3 rounded-2xl border border-hairline bg-card p-3"
              >
                <View className="h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-surface-2">
                  {b.avatarUrl ? (
                    <Image source={{ uri: b.avatarUrl }} style={{ width: 40, height: 40 }} />
                  ) : (
                    <Text className="font-ui-semibold text-[12px] text-white">{initials(b.username)}</Text>
                  )}
                </View>
                <Text numberOfLines={1} className="flex-1 font-ui-semibold text-[13px] text-white">
                  {b.username}
                </Text>
                <Pressable
                  onPress={() => onUnblock(b.userId)}
                  disabled={busyId === b.userId}
                  className="rounded-xl border border-hairline bg-surface-2 px-3.5 py-2"
                >
                  <Text className="font-ui-semibold text-[12px] text-paper">
                    {busyId === b.userId ? '…' : 'Débloquer'}
                  </Text>
                </Pressable>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </ScreenBackground>
  );
}
