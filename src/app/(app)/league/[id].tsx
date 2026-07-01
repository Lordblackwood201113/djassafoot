import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutalButton } from '@/components/brutal/BrutalButton';
import { fmtScore, scoreColor } from '@/components/leagues/LeaguesTab';
import { ScreenBackground } from '@/components/ScreenBackground';
import { hardShadow } from '@/lib/brutal';

const MUT2 = '#6B77A8';

function initials(name?: string) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/).filter(Boolean);
  return (p.length >= 2 ? p[0][0] + p[1][0] : name.trim().slice(0, 2)).toUpperCase();
}

function joinLink(code: string) {
  const origin =
    typeof window !== 'undefined' && window.location ? window.location.origin : 'https://djassafoot.app';
  return `${origin}/league/join/${code}`;
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
  const [shareMsg, setShareMsg] = useState('');

  const onShare = async () => {
    if (!league) return;
    const link = joinLink(league.code);
    const message = `Rejoins ma ligue "${league.name}" sur Djassa Foot 🪙 — code ${league.code}\n${link}`;
    if (Platform.OS !== 'web') {
      // Natif : feuille de partage système (WhatsApp, etc.).
      try {
        await Share.share({ message });
        return;
      } catch {
        /* annulé */
      }
    } else {
      const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
      // Web Share API (mobile en HTTPS).
      if (nav?.share) {
        try {
          await nav.share({ title: 'Djassa Foot', text: message, url: link });
        } catch {
          /* partage annulé */
        }
        return;
      }
      // Presse-papiers (HTTPS uniquement).
      try {
        if (nav?.clipboard?.writeText) {
          await nav.clipboard.writeText(link);
          setShareMsg('Lien copié ✅');
          return;
        }
      } catch {
        /* indispo */
      }
    }
    // Dernier recours (ex. test local en HTTP) : le lien reste affiché à copier à la main.
    setShareMsg('Copie le lien ci-dessous 👇');
  };

  // Bouton « copier » du code : copie le lien d'invitation, sinon retombe sur le partage.
  const onCopy = async () => {
    if (!league) return;
    const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
    try {
      if (nav?.clipboard?.writeText) {
        await nav.clipboard.writeText(joinLink(league.code));
        setShareMsg('Lien copié ✅');
        return;
      }
    } catch {
      /* indispo */
    }
    onShare();
  };

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
        {/* En-tête : retour · titre centré · partager */}
        <View className="flex-row items-center justify-between px-4 pb-1 pt-1">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/leaderboard'))}
            className="h-11 w-11 items-center justify-center border-2 border-white bg-ink"
            style={[{ borderRadius: 0 }, hardShadow('#E5342B', 3)]}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </Pressable>
          <Text className="font-display text-xl uppercase text-white" style={{ letterSpacing: 0.5 }}>
            Ma ligue
          </Text>
          {league ? (
            <Pressable
              onPress={onShare}
              className="h-11 w-11 items-center justify-center border-2 border-white bg-ink"
              style={[{ borderRadius: 0 }, hardShadow('#E5342B', 3)]}
            >
              <Ionicons name="share-social" size={20} color="#ffffff" />
            </Pressable>
          ) : (
            <View className="h-11 w-11" />
          )}
        </View>

        {league === undefined ? (
          <Text className="mt-16 text-center font-mono-bold text-sm uppercase text-muted">Chargement…</Text>
        ) : league === null ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-center font-display text-base uppercase text-white">Ligue introuvable</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 40, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Carte identité : blason + nom + code + copie */}
            <View
              className="items-center gap-3 border-2 border-white bg-surface-3 px-4 pb-5 pt-6"
              style={[{ borderRadius: 0 }, hardShadow('#3FCB86', 6)]}
            >
              <View
                className="h-16 w-16 items-center justify-center border-2 border-white bg-red"
                style={[{ borderRadius: 0 }, hardShadow('#0A1230', 3)]}
              >
                {league.emoji ? (
                  <Text className="text-[34px]">{league.emoji}</Text>
                ) : (
                  <Ionicons name="trophy" size={30} color="#ffffff" />
                )}
              </View>
              <Text numberOfLines={2} className="text-center font-display text-2xl uppercase text-white">
                {league.name}
              </Text>
              <Text className="font-mono-bold text-[10px] uppercase text-muted" style={{ letterSpacing: 1 }}>
                {league.memberCount} membre{league.memberCount > 1 ? 's' : ''}
                {league.isOwner ? ' · admin' : ''}
              </Text>

              {/* Code d'invitation + copie */}
              <View
                className="w-full flex-row items-center justify-between border-2 border-white bg-ink px-3 py-2.5"
                style={{ borderRadius: 0 }}
              >
                <View className="flex-row items-center gap-2.5">
                  <Text className="font-mono-bold text-[10px] uppercase" style={{ color: MUT2, letterSpacing: 1 }}>
                    Code
                  </Text>
                  <Text className="font-display text-base uppercase text-white" style={{ letterSpacing: 2 }}>
                    {league.code}
                  </Text>
                </View>
                <Pressable
                  onPress={onCopy}
                  className="h-8 w-8 items-center justify-center border-2 border-white bg-red"
                  style={{ borderRadius: 0 }}
                >
                  <Ionicons name="copy-outline" size={15} color="#ffffff" />
                </Pressable>
              </View>

              {/* Lien complet, sélectionnable → copie manuelle fiable partout (même hors HTTPS) */}
              <View className="w-full border-2 border-white/30 bg-ink px-3 py-2" style={{ borderRadius: 0 }}>
                <Text selectable numberOfLines={1} className="font-mono text-[11px] text-white/80">
                  {joinLink(league.code)}
                </Text>
              </View>
              {shareMsg ? (
                <Text className="text-center font-mono-bold text-[11px] uppercase text-green">{shareMsg}</Text>
              ) : null}
            </View>

            {/* Classement */}
            <View className="flex-row items-center gap-2 pt-1">
              <View className="h-2.5 w-2.5 bg-red" />
              <Text className="flex-1 font-display text-base uppercase text-white" style={{ letterSpacing: 0.5 }}>
                Classement
              </Text>
              <Text className="font-mono text-[10px] uppercase text-muted">{league.memberCount}</Text>
            </View>

            <View className="border-2 border-white bg-surface-3 px-3.5" style={{ borderRadius: 0 }}>
              {league.members.map((m, idx) => (
                <View key={m.userId}>
                  {idx > 0 ? <View style={{ height: 1.5, backgroundColor: '#FFFFFF1F' }} /> : null}
                  <View
                    className="flex-row items-center gap-2.5 py-3"
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: m.isMe ? '#E5342B' : 'transparent',
                      backgroundColor: m.isMe ? '#1B2452' : 'transparent',
                      paddingLeft: 6,
                    }}
                  >
                    <Text
                      className="font-display text-[15px]"
                      style={{ color: m.isMe ? '#FFFFFF' : MUT2, width: 20, textAlign: 'center' }}
                    >
                      {idx + 1}
                    </Text>
                    <View
                      className="h-8 w-8 items-center justify-center overflow-hidden border-2 border-white"
                      style={{ borderRadius: 0, backgroundColor: m.isMe ? '#E5342B' : '#23306A' }}
                    >
                      {m.avatarUrl ? (
                        <Image source={{ uri: m.avatarUrl }} style={{ width: 32, height: 32 }} />
                      ) : (
                        <Text className="font-mono-bold text-[11px] text-white">{initials(m.username)}</Text>
                      )}
                    </View>
                    <Text numberOfLines={1} className="flex-1 font-mono-bold text-[12px] uppercase text-white">
                      {m.isMe ? 'Toi' : m.username}
                      {m.isOwner ? ' 👑' : ''}
                    </Text>
                    <Text className="font-display text-[14px]" style={{ color: scoreColor(m.score) }}>
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
                </View>
              ))}
            </View>

            <Text
              className="px-2 pt-1 text-center font-mono-bold text-[9px] uppercase"
              style={{ color: MUT2, letterSpacing: 0.5, lineHeight: 14 }}
            >
              Gains comptés sur tes paris réglés depuis ton entrée
            </Text>

            {/* Actions */}
            <View className="mt-1 gap-2.5">
              <BrutalButton label="Partager le lien" variant="green" onPress={onShare} />
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
