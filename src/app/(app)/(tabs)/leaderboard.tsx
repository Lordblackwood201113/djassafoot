import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ScreenBackground } from '@/components/ScreenBackground';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';

export default function Leaderboard() {
  const me = useQuery(api.users.current);
  const globalLeaderboard = useQuery(api.leaderboard.global);
  const friendsLeaderboard = useQuery(api.leaderboard.friends);
  const pendingRequests = useQuery(api.friends.listPendingRequests);

  const sendRequest = useMutation(api.friends.sendRequest);
  const acceptRequest = useMutation(api.friends.acceptRequest);
  const declineOrRemove = useMutation(api.friends.declineOrRemove);

  const [tab, setTab] = useState<'global' | 'friends' | 'requests'>('global');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  // Recherche réactive si la requête contient au moins 2 caractères
  const searchResults = useQuery(
    api.friends.searchUsers,
    searchQuery.trim().length >= 2 ? { queryText: searchQuery.trim() } : 'skip',
  );

  const getRankStyle = (index: number) => {
    if (index === 0) return { bg: 'bg-[#FFD700]/10 border border-[#FFD700]/30', text: 'text-[#FFD700]', emoji: '🥇' };
    if (index === 1) return { bg: 'bg-[#C0C0C0]/10 border border-[#C0C0C0]/30', text: 'text-[#C0C0C0]', emoji: '🥈' };
    if (index === 2) return { bg: 'bg-[#CD7F32]/10 border border-[#CD7F32]/30', text: 'text-[#CD7F32]', emoji: '🥉' };
    return { bg: 'bg-surface-2 border border-white/[0.04]', text: 'text-muted', emoji: null };
  };

  const handleAddFriend = async (friendId: Id<'users'>) => {
    try {
      setLoadingActionId(friendId);
      setActionError('');
      await sendRequest({ friendId });
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
          <View className="px-5 pt-1 pb-4 gap-3 border-b border-white/[0.06]">
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                  setActionError('');
                }}
                className="h-9 w-9 items-center justify-center rounded-xl bg-surface"
              >
                <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              </Pressable>
              <Text className="font-display-semibold text-base text-white">{"Ajouter des amis"}</Text>
            </View>
            <TextField
              placeholder="Rechercher par nom d'utilisateur (ex: Daniel)..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              autoCapitalize="none"
            />
            {actionError ? (
              <Text className="text-red font-ui text-[12px]">{actionError}</Text>
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
                  <View key={user._id} className="flex-row items-center justify-between py-2.5 border-b border-white/[0.04]">
                    <View className="flex-row items-center gap-3">
                      {user.avatarUrl ? (
                        <Image source={{ uri: user.avatarUrl }} className="h-9 w-9 rounded-full" />
                      ) : (
                        <Ionicons name="person-circle" size={36} color="#9AA4CC" />
                      )}
                      <View>
                        <Text className="font-ui-semibold text-[14px] text-white">{user.username}</Text>
                        <Text className="font-ui text-[11px] text-muted">{`${user.points} pts`}</Text>
                      </View>
                    </View>

                    {/* Actions d'amitié */}
                    <View className="flex-row items-center">
                      {user.relationship === 'none' && (
                        <Pressable
                          disabled={loadingActionId !== null}
                          onPress={() => handleAddFriend(user._id)}
                          className="bg-red px-3 py-1.5 rounded-xl active:opacity-80"
                        >
                          {loadingActionId === user._id ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text className="font-ui-bold text-xs text-white">{"Ajouter"}</Text>
                          )}
                        </Pressable>
                      )}
                      {user.relationship === 'pending_sent' && (
                        <View className="bg-surface-2 px-3 py-1.5 rounded-xl border border-white/5">
                          <Text className="font-ui-semibold text-xs text-muted">{"Invité"}</Text>
                        </View>
                      )}
                      {user.relationship === 'pending_received' && user.relationshipId && (
                        <View className="flex-row gap-1.5">
                          <Pressable
                            disabled={loadingActionId !== null}
                            onPress={() => handleAcceptRequest(user.relationshipId!)}
                            className="bg-green px-2.5 py-1.5 rounded-xl"
                          >
                            {loadingActionId === user.relationshipId ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            )}
                          </Pressable>
                          <Pressable
                            disabled={loadingActionId !== null}
                            onPress={() => handleDeclineRequest(user.relationshipId!)}
                            className="bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10"
                          >
                            {loadingActionId === user.relationshipId ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Ionicons name="close" size={14} color="#FFFFFF" />
                            )}
                          </Pressable>
                        </View>
                      )}
                      {user.relationship === 'accepted' && user.relationshipId && (
                        <Pressable
                          disabled={loadingActionId !== null}
                          onPress={() => handleDeclineRequest(user.relationshipId!)}
                          className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl active:bg-red/10"
                        >
                          {loadingActionId === user.relationshipId ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text className="font-ui-medium text-xs text-white/80">{"Ami"}</Text>
                          )}
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        ) : (
          /* En-tête standard avec bouton ajouter ami */
          <View className="flex-row justify-between items-center px-5 pb-2">
            <Text className="font-display-bold text-xl text-white">{"Classements"}</Text>
            <Pressable
              onPress={() => setShowSearch(true)}
              className="h-9 w-9 items-center justify-center rounded-2xl bg-surface border border-white/[0.06] active:scale-95"
            >
              <Ionicons name="person-add" size={18} color="#FFFFFF" />
            </Pressable>
          </View>
        )}

        {/* Onglets */}
        <View className="mx-5 my-3 flex-row gap-1 rounded-2xl bg-surface p-1.5">
          {(['global', 'friends', 'requests'] as const).map((t) => {
            const isSelected = tab === t;
            return (
              <Pressable
                key={t}
                onPress={() => {
                  setTab(t);
                  setActionError('');
                }}
                className={`flex-1 items-center rounded-xl py-2 flex-row justify-center gap-1.5 ${
                  isSelected ? 'bg-red' : ''
                }`}
              >
                <Text
                  className={`text-[13px] ${
                    isSelected ? 'font-ui-bold text-white' : 'font-ui-medium text-muted'
                  }`}
                >
                  {t === 'global' ? 'Global' : t === 'friends' ? 'Amis' : 'Demandes'}
                </Text>
                {t === 'requests' && showPendingBadge && (
                  <View className="bg-white h-4 px-1 rounded-full items-center justify-center min-w-4">
                    <Text className="font-display-bold text-[9px] text-red">
                      {pendingRequests.length}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* Contenu principal */}
        {tab === 'requests' ? (
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
                <View key={req.relationshipId} className="flex-row items-center justify-between bg-surface p-4 rounded-2xl border border-white/[0.04]">
                  <View className="flex-row items-center gap-3">
                    {req.avatarUrl ? (
                      <Image source={{ uri: req.avatarUrl }} className="h-10 w-10 rounded-full" />
                    ) : (
                      <Ionicons name="person-circle" size={40} color="#9AA4CC" />
                    )}
                    <View>
                      <Text className="font-ui-bold text-[14px] text-white">{req.username}</Text>
                      <Text className="font-ui text-[12px] text-muted">{`${req.points} pts`}</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      disabled={loadingActionId !== null}
                      onPress={() => handleAcceptRequest(req.relationshipId)}
                      className="bg-green px-4 py-2 rounded-xl flex-row items-center gap-1 active:opacity-90"
                    >
                      {loadingActionId === req.relationshipId ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                          <Text className="font-ui-bold text-xs text-white">{"Accepter"}</Text>
                        </>
                      )}
                    </Pressable>
                    <Pressable
                      disabled={loadingActionId !== null}
                      onPress={() => handleDeclineRequest(req.relationshipId)}
                      className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex-row items-center gap-1 active:opacity-90"
                    >
                      {loadingActionId === req.relationshipId ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={16} color="#FFFFFF" />
                          <Text className="font-ui-medium text-xs text-white/80">{"Refuser"}</Text>
                        </>
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
                  ? "Les premiers points arrivent bientôt."
                  : "Ajoute tes amis pour comparer vos pronos !"}
              </Text>
              {tab === 'friends' && (
                <View className="mt-4 w-36">
                  <Button label="Ajouter un ami" onPress={() => setShowSearch(true)} />
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
                const rStyle = getRankStyle(idx);
                return (
                  <View
                    key={item._id}
                    className={`flex-row items-center justify-between p-3.5 rounded-2xl bg-surface ${
                      isMe ? 'border-2 border-red bg-surface-2' : 'border border-white/[0.04]'
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      {/* Badge de Rang */}
                      <View className={`h-8 w-8 items-center justify-center rounded-full ${rStyle.bg}`}>
                        {rStyle.emoji ? (
                          <Text className="text-[14px]">{rStyle.emoji}</Text>
                        ) : (
                          <Text className={`font-display-bold text-xs ${rStyle.text}`}>{idx + 1}</Text>
                        )}
                      </View>

                      {/* Photo/Avatar + Nom */}
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} className="h-9 w-9 rounded-full" />
                      ) : (
                        <Ionicons name="person-circle" size={36} color="#9AA4CC" />
                      )}
                      <View>
                        <Text className={`font-ui-semibold text-[14px] ${isMe ? 'text-white font-ui-bold' : 'text-white'}`}>
                          {item.username}
                          {isMe ? ' (toi)' : ''}
                        </Text>
                        <Text className="font-ui text-[11px] text-muted mt-0.5">
                          {`${item.streak} j. de série 🔥`}
                        </Text>
                      </View>
                    </View>

                    <Text className={`font-display-bold text-[14px] ${isMe ? 'text-red text-[15px]' : 'text-white'}`}>
                      {item.points.toLocaleString('fr-FR')} pts
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          )
        )}
      </View>
    </ScreenBackground>
  );
}
