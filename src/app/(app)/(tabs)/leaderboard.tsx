import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ScreenBackground } from '@/components/ScreenBackground';
import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { BrutalSegment } from '@/components/brutal/Segment';
import { LeaguesTab } from '@/components/leagues/LeaguesTab';
import { EVENTS, track } from '@/lib/analytics';
import { hardShadow } from '@/lib/brutal';
import { appOrigin, shareLink } from '@/lib/share';

// Initiales majuscules pour l'avatar de repli (max 2 lettres).
function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.length >= 2 ? parts[0][0] + parts[1][0] : name.trim().slice(0, 2);
  return chars.toUpperCase();
}

export default function Leaderboard() {
  const router = useRouter();
  const me = useQuery(api.users.current);
  const globalLeaderboard = useQuery(api.leaderboard.global);
  const friendsLeaderboard = useQuery(api.leaderboard.friends);
  const pendingRequests = useQuery(api.friends.listPendingRequests);

  const sendRequest = useMutation(api.friends.sendRequest);
  const acceptRequest = useMutation(api.friends.acceptRequest);
  const declineOrRemove = useMutation(api.friends.declineOrRemove);

  const [tab, setTab] = useState<'global' | 'friends' | 'leagues' | 'requests'>('global');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');

  // Inviter un ami PAS ENCORE inscrit : on partage le lien de l'app (il s'inscrit puis peut jouer).
  const onInviteFriend = async () => {
    const url = appOrigin();
    const mode = await shareLink(
      'Rejoins-moi sur Djassa Foot pour pronostiquer la Coupe du Monde 2026 🪙⚽',
      url,
    );
    setInviteMsg(mode === 'copied' ? 'Lien copié ✅' : mode === 'manual' ? url : '');
  };

  // Recherche réactive si la requête contient au moins 2 caractères
  const searchResults = useQuery(
    api.friends.searchUsers,
    searchQuery.trim().length >= 2 ? { queryText: searchQuery.trim() } : 'skip',
  );

  // Couleur du numéro de rang (or / argent / bronze pour le podium).
  const rankColor = (index: number) => {
    if (index === 0) return '#FFD24A';
    if (index === 1) return '#C0C0C0';
    if (index === 2) return '#CD7F32';
    return '#9AA4CC';
  };

  const handleAddFriend = async (friendId: Id<'users'>) => {
    try {
      setLoadingActionId(friendId);
      setActionError('');
      await sendRequest({ friendId });
      track(EVENTS.friendAdded, { friendId });
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de l\'envoi de la demande');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleAcceptRequest = async (relId: Id<'friends'>) => {
    try {
      setLoadingActionId(relId);
      setActionError('');
      await acceptRequest({ relationshipId: relId });
      track(EVENTS.friendRequestAccepted, { relationshipId: relId });
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de l\'acceptation');
    } finally {
      setLoadingActionId(null);
    }
  };

  const handleDeclineRequest = async (relId: Id<'friends'>) => {
    try {
      setLoadingActionId(relId);
      setActionError('');
      await declineOrRemove({ relationshipId: relId });
    } catch (err: any) {
      setActionError(err.message || 'Erreur lors de l\'annulation');
    } finally {
      setLoadingActionId(null);
    }
  };

  const currentLeaderboard = tab === 'global' ? globalLeaderboard : friendsLeaderboard;
  const showPendingBadge = pendingRequests && pendingRequests.length > 0;

  return (
    <ScreenBackground variant="app">
      <View className="flex-1">
        <AppHeader />
        
        {/* Toggle Recherche */}
        {showSearch ? (
          <View className="px-5 pt-1 pb-4 gap-3 border-b-2 border-white">
            <View className="flex-row items-center gap-2.5">
              <Pressable
                onPress={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                  setActionError('');
                }}
                className="h-9 w-9 items-center justify-center border-2 border-white bg-surface-3"
                style={{ borderRadius: 0 }}
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>
              <View className="h-2.5 w-2.5 bg-red" />
              <Text className="font-display text-base text-white uppercase">{"AJOUTER DES AMIS"}</Text>
            </View>
            <TextInput
              placeholder="RECHERCHER UN PSEUDO (EX: DANIEL)..."
              placeholderTextColor="#9AA4CC"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              autoCapitalize="none"
              className="w-full border-2 border-white bg-surface-3 px-4 py-3 font-mono text-[13px] text-white"
              style={{ borderRadius: 0 }}
            />
            {actionError ? (
              <Text className="text-red font-mono-bold text-[11px] uppercase">{actionError}</Text>
            ) : null}

            {/* Inviter un ami PAS ENCORE inscrit sur l'app */}
            <Pressable
              onPress={onInviteFriend}
              className="flex-row items-center justify-center gap-2 border-2 border-green bg-surface-3 py-2.5"
              style={{ borderRadius: 0 }}
            >
              <Ionicons name="share-social" size={15} color="#3FCB86" />
              <Text className="font-mono-bold text-[11px] uppercase text-green">
                Ton ami n&apos;est pas sur l&apos;app ? Invite-le
              </Text>
            </Pressable>
            {inviteMsg ? (
              <Text selectable numberOfLines={1} className="text-center font-mono text-[10px] text-muted">
                {inviteMsg}
              </Text>
            ) : null}

            {/* Résultats de recherche */}
            <ScrollView className="max-h-72 mt-1" showsVerticalScrollIndicator={false}>
              {searchQuery.trim().length < 2 ? (
                <Text className="font-ui text-xs text-muted text-center py-4">
                  {"Saisis au moins 2 caractères pour rechercher"}
                </Text>
              ) : searchResults === undefined ? (
                <ActivityIndicator color="#E5342B" className="py-4" />
              ) : searchResults.length === 0 ? (
                <Text className="font-ui text-xs text-muted text-center py-4">
                  {"Aucun joueur trouvé"}
                </Text>
              ) : (
                searchResults.map((user) => (
                  <View
                    key={user._id}
                    className="mb-2 flex-row items-center justify-between border-2 border-white bg-surface-3 px-3 py-2.5"
                    style={{ borderRadius: 0 }}
                  >
                    <Pressable
                      onPress={() => router.push(`/user/${user._id}`)}
                      className="flex-1 flex-row items-center gap-2.5"
                    >
                      <View
                        className="h-9 w-9 items-center justify-center overflow-hidden border-2 border-white bg-surface-2"
                        style={{ borderRadius: 0 }}
                      >
                        {user.avatarUrl ? (
                          <Image source={{ uri: user.avatarUrl }} style={{ width: 36, height: 36 }} />
                        ) : (
                          <Text className="font-display text-[12px] text-white">{initials(user.username)}</Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text numberOfLines={1} className="font-mono-bold text-[13px] text-white">
                          {user.username.toUpperCase()}
                        </Text>
                        <Text className="font-mono text-[10px] text-muted">
                          {user.flames.toLocaleString('fr-FR')} 🪙
                        </Text>
                      </View>
                    </Pressable>

                    {/* Actions d'amitié */}
                    <View className="flex-row items-center gap-1.5">
                      {user.relationship === 'none' && (
                        <Pressable
                          disabled={loadingActionId !== null}
                          onPress={() => handleAddFriend(user._id)}
                          className="bg-red px-3 py-1.5"
                          style={{ borderRadius: 0 }}
                        >
                          {loadingActionId === user._id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text className="font-mono-bold text-[10px] text-white">AJOUTER</Text>
                          )}
                        </Pressable>
                      )}
                      {user.relationship === 'pending_sent' && (
                        <View className="border-2 border-white bg-surface-2 px-3 py-1.5" style={{ borderRadius: 0 }}>
                          <Text className="font-mono-bold text-[10px] text-muted">INVITÉ</Text>
                        </View>
                      )}
                      {user.relationship === 'pending_received' && user.relationshipId && (
                        <>
                          <Pressable
                            disabled={loadingActionId !== null}
                            onPress={() => handleAcceptRequest(user.relationshipId!)}
                            className="bg-green px-2.5 py-1.5"
                            style={{ borderRadius: 0 }}
                          >
                            {loadingActionId === user.relationshipId ? (
                              <ActivityIndicator size="small" color="#0A1230" />
                            ) : (
                              <Ionicons name="checkmark" size={14} color="#0A1230" />
                            )}
                          </Pressable>
                          <Pressable
                            disabled={loadingActionId !== null}
                            onPress={() => handleDeclineRequest(user.relationshipId!)}
                            className="border-2 border-white bg-ink px-2.5 py-1.5"
                            style={{ borderRadius: 0 }}
                          >
                            {loadingActionId === user.relationshipId ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Ionicons name="close" size={14} color="#FFFFFF" />
                            )}
                          </Pressable>
                        </>
                      )}
                      {user.relationship === 'accepted' && user.relationshipId && (
                        <View className="border-2 border-green bg-ink px-3 py-1.5" style={{ borderRadius: 0 }}>
                          <Text className="font-mono-bold text-[10px] text-green">AMI</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        ) : (
          /* En-tête : titre + bouton recherche */
          <View className="flex-row items-center justify-between px-[18px] pb-2 pt-1">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 bg-red" />
              <Text className="font-display text-[22px] uppercase text-white">CLASSEMENT</Text>
            </View>
            <Pressable
              onPress={() => setShowSearch(true)}
              className="h-9 w-9 items-center justify-center border-2 border-white bg-surface-3"
              style={{ borderRadius: 0 }}
            >
              <Ionicons name="person-add" size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        )}

        {/* Onglets brutalistes */}
        <View className="mx-[18px] my-3 flex-row border-2 border-white" style={{ borderRadius: 0 }}>
          {(['global', 'friends', 'leagues', 'requests'] as const).map((t, i) => {
            const isSelected = tab === t;
            const label =
              t === 'global' ? 'GLOBAL' : t === 'friends' ? 'AMIS' : t === 'leagues' ? 'LIGUES' : 'DEMANDES';
            return (
              <Pressable
                key={t}
                onPress={() => {
                  setTab(t);
                  setActionError('');
                }}
                className={`flex-1 flex-row items-center justify-center gap-1 py-2.5 ${
                  isSelected ? 'bg-red' : 'bg-ink'
                }`}
                style={i < 3 ? { borderRightWidth: 2, borderColor: '#FFFFFF' } : undefined}
              >
                <Text
                  className={`font-mono-bold text-[11px] ${isSelected ? 'text-white' : 'text-muted'}`}
                >
                  {label}
                </Text>
                {t === 'requests' && showPendingBadge && (
                  <View className="h-4 min-w-4 items-center justify-center bg-white px-1" style={{ borderRadius: 0 }}>
                    <Text className="font-mono-bold text-[9px] text-red">{pendingRequests.length}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Contenu principal */}
        {tab === 'leagues' ? (
          <LeaguesTab />
        ) : tab === 'requests' ? (
          /* Onglet Demandes Reçues */
          pendingRequests === undefined ? (
            <ActivityIndicator color="#E5342B" className="my-16" />
          ) : pendingRequests.length === 0 ? (
            <View className="flex-1 items-center justify-center px-10">
              <Ionicons name="people-outline" size={48} color="#6B76A8" />
              <Text className="mt-3 text-center font-display-bold text-base text-white">
                {"Aucune invitation reçue"}
              </Text>
              <Text className="mt-1 text-center font-ui text-sm text-muted">
                {"Partage ton nom d'utilisateur pour recevoir des invitations !"}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 10 }}>
              {actionError ? (
                <Text className="text-red font-ui text-[12px] mb-2">{actionError}</Text>
              ) : null}
              {pendingRequests.map((req) => (
                <View
                  key={req.relationshipId}
                  className="flex-row items-center justify-between border-2 border-white bg-surface-3 p-3"
                  style={{ borderRadius: 0 }}
                >
                  <View className="flex-1 flex-row items-center gap-2.5">
                    <View
                      className="h-10 w-10 items-center justify-center overflow-hidden border-2 border-white bg-surface-2"
                      style={{ borderRadius: 0 }}
                    >
                      {req.avatarUrl ? (
                        <Image source={{ uri: req.avatarUrl }} style={{ width: 40, height: 40 }} />
                      ) : (
                        <Text className="font-display text-[13px] text-white">{initials(req.username)}</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text numberOfLines={1} className="font-mono-bold text-[13px] text-white">
                        {req.username.toUpperCase()}
                      </Text>
                      <Text className="font-mono text-[10px] text-muted">
                        {req.flames.toLocaleString('fr-FR')} 🪙
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-1.5">
                    <Pressable
                      disabled={loadingActionId !== null}
                      onPress={() => handleAcceptRequest(req.relationshipId)}
                      className="flex-row items-center gap-1 bg-green px-3 py-2"
                      style={{ borderRadius: 0 }}
                    >
                      {loadingActionId === req.relationshipId ? (
                        <ActivityIndicator size="small" color="#0A1230" />
                      ) : (
                        <Text className="font-mono-bold text-[10px] text-ink">ACCEPTER</Text>
                      )}
                    </Pressable>
                    <Pressable
                      disabled={loadingActionId !== null}
                      onPress={() => handleDeclineRequest(req.relationshipId)}
                      className="border-2 border-white bg-ink px-2.5 py-2"
                      style={{ borderRadius: 0 }}
                    >
                      {loadingActionId === req.relationshipId ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="close" size={16} color="#FFFFFF" />
                      )}
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          )
        ) : (
          /* Onglets Classement (Global ou Amis) */
          currentLeaderboard === undefined ? (
            <ActivityIndicator color="#E5342B" className="my-16" />
          ) : currentLeaderboard.length === 0 ? (
            <View className="flex-1 items-center justify-center px-10">
              <Ionicons name="trending-up" size={48} color="#6B76A8" />
              <Text className="mt-3 text-center font-display-bold text-base text-white">
                {tab === 'global' ? "Le classement est vide" : "Aucun ami dans ton classement"}
              </Text>
              <Text className="mt-1 text-center font-ui text-sm text-muted">
                {tab === 'global'
                  ? "Le classement se remplira au fil des pronos."
                  : "Ajoute tes amis pour comparer vos pronos !"}
              </Text>
              {tab === 'friends' && (
                <View className="mt-4">
                  <BrutalButton
                    label="AJOUTER UN AMI"
                    variant="primary"
                    full={false}
                    onPress={() => setShowSearch(true)}
                  />
                </View>
              )}
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {currentLeaderboard.map((item, idx) => {
                const isMe = me?._id === item._id;
                const col = isMe ? '#E5342B' : rankColor(idx);
                return (
                  <Pressable
                    key={item._id}
                    onPress={() => router.push(`/user/${item._id}`)}
                    className="flex-row items-center gap-3 border-2 bg-surface-3 px-3.5 py-3"
                    style={{ borderRadius: 0, borderColor: isMe ? '#E5342B' : '#FFFFFF' }}
                  >
                    <Text
                      className="font-display text-[18px]"
                      style={{ color: col, width: 24, textAlign: 'center' }}
                    >
                      {idx + 1}
                    </Text>
                    <View
                      className="items-center justify-center overflow-hidden border-2 bg-surface-2"
                      style={{ width: 40, height: 40, borderRadius: 0, borderColor: col }}
                    >
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={{ width: 40, height: 40 }} />
                      ) : (
                        <Text className="font-display text-[13px] text-white">
                          {initials(item.username)}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text numberOfLines={1} className="font-mono-bold text-[13px] text-white">
                        {item.username.toUpperCase()}
                        {isMe ? ' · TOI' : ''}
                      </Text>
                      <Text className="font-mono text-[10px] text-muted">
                        {item.streak} J. DE SÉRIE
                      </Text>
                    </View>
                    <Text className="font-mono-bold text-[12px]" style={{ color: col }}>
                      {item.flames.toLocaleString('fr-FR')} 🪙
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )
        )}
      </View>
    </ScreenBackground>
  );
}
