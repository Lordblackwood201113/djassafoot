import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { fmtScore, scoreColor } from '@/components/leagues/LeaguesTab';
import { ScreenBackground } from '@/components/ScreenBackground';
import { hardShadow } from '@/lib/brutal';

function initials(name?: string) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/).filter(Boolean);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.trim().slice(0, 2)).toUpperCase();
}
function rankColor(i: number) {
  return i === 0 ? '#FFD24A' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#9AA4CC';
}

function joinLink(code: string) {
  const origin =
    typeof window !== 'undefined' && window.location ? window.location.origin : 'https://djassafoot.app';
  return `${origin}/league/join/${code}`;
}

async function shareLeague(name: string, code: string) {
  const link = joinLink(code);
  const message = `Rejoins ma ligue "${name}" sur Djassa Foot 🪙 — code ${code}\n${link}`;
  const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
  try {
    if (nav?.share) {
      await nav.share({ title: 'Djassa Foot', text: message, url: link });
      return;
    }
  } catch {
    /* annulé */
  }
  try {
    await Share.share({ message });
    return;
  } catch {
    /* non supporté */
  }
  try {
    if (nav?.clipboard) await nav.clipboard.writeText(link);
  } catch {
    /* ignore */
  }
}

export default function LeagueDetail() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const league = useQuery(api.leagues.detail, id ? { leagueId: id as Id<'leagues'> } : 'skip');
  const leave = useMutation(api.leagues.leave);
  const remove = useMutation(api.leagues.remove);
  const kick = useMutation(api.leagues.kick);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const onLeave = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await leave({ leagueId: id as Id<'leagues'> });
      router.replace('/leaderboard');
    } finally {
      setBusy(false);
    }
  };
  const onDelete = async () => {
    if (!id) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    try {
      await remove({ leagueId: id as Id<'leagues'> });
      router.replace('/leaderboard');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground variant="app">
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="px-4 pt-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/leaderboard'))}
            className="h-11 w-11 items-center justify-center border-2 border-white bg-ink"
            style={[{ borderRadius: 0 }, hardShadow('#E5342B', 4)]}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </Pressable>
        </View>

        {league === undefined ? (
          <Text className="mt-16 text-center font-mono-bold text-sm uppercase text-muted">Chargement…</Text>
        ) : league === null ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-center font-display text-base uppercase text-white">Ligue introuvable</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {/* En-tête centré : logo + nom (une seule fois) */}
            <View className="items-center gap-3 pt-1">
              <BrutalBox
                shadow="#E5342B"
                offset={6}
                borderWidth={2.5}
                className="h-20 w-20 items-center justify-center bg-surface-3"
              >
                <Text className="text-[40px]">{league.emoji || '🏆'}</Text>
              </BrutalBox>
              <View className="items-center gap-1">
                <Text numberOfLines={2} className="text-center font-display text-2xl uppercase text-white">
                  {league.name}
                </Text>
                <Text className="font-mono text-[10px] uppercase text-muted">
                  {league.memberCount} membre{league.memberCount > 1 ? 's' : ''}
                  {league.isOwner ? ' · tu es admin' : ''}
                </Text>
              </View>
            </View>

            {/* Invitation */}
            <BrutalBox shadow="#3FCB86" offset={5} borderWidth={2} className="gap-3 bg-surface-3 p-4">
              <Text className="font-mono-bold text-[11px] uppercase text-muted" style={{ letterSpacing: 1 }}>
                Code d'invitation
              </Text>
              <View className="flex-row items-center justify-between">
                <Text className="font-display text-3xl uppercase text-white" style={{ letterSpacing: 4 }}>
                  {league.code}
                </Text>
                <View className="h-2.5 w-2.5 bg-green" />
              </View>
              <BrutalButton
                label="Partager le lien"
                variant="green"
                onPress={() => shareLeague(league.name, league.code)}
              />
            </BrutalBox>

            {/* Classement */}
            <View className="flex-row items-center gap-2 pt-1">
              <View className="h-2.5 w-2.5 bg-red" />
              <Text className="font-display text-base uppercase text-white">Classement</Text>
              <Text className="font-mono text-[9px] uppercase text-muted">· jetons depuis l'entrée</Text>
            </View>

            {league.members.map((m, idx) => {
              const col = m.isMe ? '#E5342B' : rankColor(idx);
              return (
                <View
                  key={m.userId}
                  className="flex-row items-center gap-3 border-2 bg-surface-3 px-3.5 py-3"
                  style={{ borderRadius: 0, borderColor: m.isMe ? '#E5342B' : '#FFFFFF' }}
                >
                  <Text
                    className="font-display text-[18px]"
                    style={{ color: col, width: 22, textAlign: 'center' }}
                  >
                    {idx + 1}
                  </Text>
                  <View
                    className="h-9 w-9 items-center justify-center overflow-hidden border-2 bg-surface-2"
                    style={{ borderRadius: 0, borderColor: col }}
                  >
                    {m.avatarUrl ? (
                      <Image source={{ uri: m.avatarUrl }} style={{ width: 36, height: 36 }} />
                    ) : (
                      <Text className="font-display text-[12px] text-white">{initials(m.username)}</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text numberOfLines={1} className="font-mono-bold text-[13px] uppercase text-white">
                      {m.username.toUpperCase()}
                      {m.isMe ? ' · TOI' : ''}
                    </Text>
                    <Text className="font-mono text-[9px] uppercase text-muted">
                      {m.isOwner ? '👑 admin' : 'membre'}
                    </Text>
                  </View>
                  <Text className="font-display text-[15px]" style={{ color: scoreColor(m.score) }}>
                    {fmtScore(m.score)}
                  </Text>
                  {league.isOwner && !m.isMe ? (
                    <Pressable
                      onPress={() => kick({ leagueId: league._id, userId: m.userId })}
                      className="h-7 w-7 items-center justify-center border-2 border-white bg-ink"
                      style={{ borderRadius: 0 }}
                    >
                      <Ionicons name="close" size={14} color="#E5342B" />
                    </Pressable>
                  ) : null}
                </View>
              );
            })}

            {/* Actions */}
            <View className="mt-2 gap-2.5">
              {league.isOwner ? (
                <BrutalButton
                  label={confirmDelete ? 'Confirmer la suppression' : 'Supprimer la ligue'}
                  variant={confirmDelete ? 'primary' : 'ghost'}
                  onPress={onDelete}
                  loading={busy}
                />
              ) : (
                <BrutalButton label="Quitter la ligue" variant="ghost" onPress={onLeave} loading={busy} />
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenBackground>
  );
}
