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
import { pickSquareImage, uploadToConvex } from '@/lib/leagueLogo';

const MUT2 = '#6B7280';

const LEAGUE_REPORT_REASONS = ['Nom offensant', 'Logo inapproprié', 'Spam', 'Autre'];

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
  const generateUploadUrl = useMutation(api.leagues.generateUploadUrl);
  const setLogo = useMutation(api.leagues.setLogo);
  const removeLogo = useMutation(api.leagues.removeLogo);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const report = useMutation(api.moderation.report);
  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

  // Importe une image de l'appareil → upload Convex → définit le logo de la ligue.
  const onChangeLogo = async () => {
    if (!league || logoBusy) return;
    setLogoBusy(true);
    try {
      const picked = await pickSquareImage();
      if (!picked) return; // annulé / accès refusé
      const url = await generateUploadUrl();
      const storageId = await uploadToConvex(url, picked.blob);
      await setLogo({ leagueId: league._id, storageId: storageId as Id<'_storage'> });
    } catch (e) {
      setShareMsg(e instanceof Error ? e.message : "Échec de l'import du logo");
    } finally {
      setLogoBusy(false);
    }
  };
  const onRemoveLogo = async () => {
    if (!league || logoBusy) return;
    setLogoBusy(true);
    try {
      await removeLogo({ leagueId: league._id });
    } finally {
      setLogoBusy(false);
    }
  };

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

  const onReportLeague = async (reason: string) => {
    if (!league) return;
    setReporting(true);
    try {
      const res = await report({ targetType: 'league', targetLeagueId: league._id, reason });
      setReportOpen(false);
      setReportMsg(res?.already ? 'Déjà signalée. Merci.' : 'Ligue signalée. Merci.');
    } catch {
      /* ignoré */
    } finally {
      setReporting(false);
    }
  };

  return (
    <ScreenBackground variant="app">
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        {/* En-tête : retour · titre centré · partager */}
        <View className="flex-row items-center justify-between px-4 pb-1 pt-1">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/leaderboard'))}
            className="h-11 w-11 items-center justify-center rounded-[13px] border border-hairline bg-surface-2"
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </Pressable>
          <Text className="font-display text-xl text-white">
            Ma ligue
          </Text>
          {league ? (
            <Pressable
              onPress={onShare}
              className="h-11 w-11 items-center justify-center rounded-[13px] border border-hairline bg-surface-2"
            >
              <Ionicons name="share-social" size={20} color="#ffffff" />
            </Pressable>
          ) : (
            <View className="h-11 w-11" />
          )}
        </View>

        {league === undefined ? (
          <Text className="mt-16 text-center font-ui-semibold text-sm text-muted">Chargement…</Text>
        ) : league === null ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-center font-display text-base text-white">Ligue introuvable</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 40, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Carte identité : blason + nom + code + copie */}
            <View className="items-center gap-3 rounded-2xl border border-hairline bg-card px-4 pb-5 pt-6">
              <Pressable
                disabled={!league.isOwner || logoBusy}
                onPress={onChangeLogo}
                className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-surface-2"
              >
                {league.logoUrl ? (
                  <Image source={{ uri: league.logoUrl }} style={{ width: 60, height: 60 }} contentFit="cover" />
                ) : league.emoji ? (
                  <Text className="text-[34px]">{league.emoji}</Text>
                ) : (
                  <Ionicons name="trophy" size={30} color="#ffffff" />
                )}
                {league.isOwner ? (
                  <View className="absolute bottom-0 right-0 h-5 w-5 items-center justify-center rounded-full border border-hairline bg-ink">
                    <Ionicons name={logoBusy ? 'hourglass' : 'camera'} size={11} color="#ffffff" />
                  </View>
                ) : null}
              </Pressable>
              <Text numberOfLines={2} className="text-center font-display text-2xl text-white">
                {league.name}
              </Text>
              <Text className="font-ui-semibold text-[10px] text-muted">
                {league.memberCount} membre{league.memberCount > 1 ? 's' : ''}
                {league.isOwner ? ' · admin' : ''}
              </Text>
              {league.isOwner ? (
                <View className="flex-row items-center gap-3">
                  <Pressable onPress={onChangeLogo} disabled={logoBusy}>
                    <Text className="font-ui-semibold text-[10px] text-muted">
                      {logoBusy ? 'Import…' : league.logoUrl ? 'Changer le logo' : 'Importer un logo'}
                    </Text>
                  </Pressable>
                  {league.logoUrl ? (
                    <Pressable onPress={onRemoveLogo} disabled={logoBusy}>
                      <Text className="font-ui-semibold text-[10px] text-muted">
                        Retirer
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {/* Code d'invitation + copie */}
              <View className="w-full flex-row items-center justify-between rounded-xl border border-hairline bg-surface-2 px-3 py-2.5">
                <View className="flex-row items-center gap-2.5">
                  <Text className="font-ui-semibold text-[10px]" style={{ color: MUT2 }}>
                    Code
                  </Text>
                  <Text className="font-display text-base text-white" style={{ letterSpacing: 2 }}>
                    {league.code}
                  </Text>
                </View>
                <Pressable
                  onPress={onCopy}
                  className="h-8 w-8 items-center justify-center rounded-[13px] border border-hairline bg-surface-2"
                >
                  <Ionicons name="copy-outline" size={15} color="#ffffff" />
                </Pressable>
              </View>

              {/* Lien complet, sélectionnable → copie manuelle fiable partout (même hors HTTPS) */}
              <View className="w-full rounded-xl border border-hairline bg-surface-2 px-3 py-2">
                <Text selectable numberOfLines={1} className="font-ui-medium text-[11px] text-muted">
                  {joinLink(league.code)}
                </Text>
              </View>
              {shareMsg ? (
                <Text className="text-center font-ui-semibold text-[11px] text-green">{shareMsg}</Text>
              ) : null}
            </View>

            {/* Classement */}
            <View className="flex-row items-center gap-2 pt-1">
              <Text className="flex-1 font-display text-base text-white">
                Classement
              </Text>
              <Text className="font-ui-medium text-[10px] text-muted">{league.memberCount}</Text>
            </View>

            <View className="rounded-2xl border border-hairline bg-card px-3.5">
              {league.members.map((m, idx) => (
                <View key={m.userId}>
                  {idx > 0 ? <View className="h-px bg-line" /> : null}
                  <View
                    className="flex-row items-center gap-2.5 py-3"
                    style={{
                      backgroundColor: m.isMe ? 'rgba(255,255,255,0.04)' : 'transparent',
                      paddingLeft: 6,
                    }}
                  >
                    <Text
                      className="font-display text-[15px]"
                      style={{ color: m.isMe ? '#FFFFFF' : MUT2, width: 20, textAlign: 'center' }}
                    >
                      {idx + 1}
                    </Text>
                    <View className="h-8 w-8 items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-surface-2">
                      {m.avatarUrl ? (
                        <Image source={{ uri: m.avatarUrl }} style={{ width: 32, height: 32 }} />
                      ) : (
                        <Text className="font-ui-semibold text-[11px] text-white">{initials(m.username)}</Text>
                      )}
                    </View>
                    <Text numberOfLines={1} className="flex-1 font-ui-semibold text-[12px] text-white">
                      {m.isMe ? 'Toi' : m.username}
                      {m.isOwner ? ' 👑' : ''}
                    </Text>
                    <Text className="font-display text-[14px]" style={{ color: scoreColor(m.score) }}>
                      {fmtScore(m.score)}
                    </Text>
                    {league.isOwner && !m.isMe ? (
                      <Pressable
                        onPress={() => kick({ leagueId: league._id, userId: m.userId })}
                        className="h-7 w-7 items-center justify-center rounded-[13px] border border-hairline bg-surface-2"
                      >
                        <Ionicons name="close" size={14} color="#A1A1AA" />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>

            <Text
              className="px-2 pt-1 text-center font-ui-semibold text-[9px]"
              style={{ color: MUT2, lineHeight: 14 }}
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

              {/* Signaler la ligue (pour un membre non-admin) */}
              {!league.isOwner ? (
                <>
                  <Pressable
                    onPress={() => setReportOpen((v) => !v)}
                    hitSlop={8}
                    className="flex-row items-center justify-center gap-1.5 pt-0.5"
                  >
                    <Ionicons name="flag-outline" size={13} color="#A1A1AA" />
                    <Text className="font-ui-semibold text-[12px] text-muted">Signaler la ligue</Text>
                  </Pressable>
                  {reportOpen ? (
                    <View className="gap-2.5 rounded-2xl border border-hairline bg-surface p-3.5">
                      <Text className="font-ui-semibold text-[12px] text-white">
                        Signaler cette ligue pour :
                      </Text>
                      <View className="flex-row flex-wrap justify-center gap-2">
                        {LEAGUE_REPORT_REASONS.map((r) => (
                          <Pressable
                            key={r}
                            onPress={() => onReportLeague(r)}
                            disabled={reporting}
                            className="rounded-full border border-hairline bg-surface-2 px-3 py-1.5"
                          >
                            <Text className="font-ui-medium text-[12px] text-paper">{r}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}
                  {reportMsg ? (
                    <Text className="text-center font-ui-medium text-[12px] text-green">{reportMsg}</Text>
                  ) : null}
                </>
              ) : null}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenBackground>
  );
}
