import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';

export function scoreColor(n: number) {
  return n > 0 ? '#6FA287' : n < 0 ? '#E5484D' : '#A1A1AA';
}
export function fmtScore(n: number) {
  return `${n > 0 ? '+' : ''}${n.toLocaleString('fr-FR')}`;
}

export function LeaguesTab() {
  const router = useRouter();
  const leagues = useQuery(api.leagues.myLeagues);
  const joinByCode = useMutation(api.leagues.joinByCode);
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const onJoin = async () => {
    if (code.trim().length < 4) {
      setError('Code trop court');
      return;
    }
    setJoining(true);
    setError('');
    try {
      const { leagueId } = await joinByCode({ code: code.trim() });
      setCode('');
      router.push(`/league/${leagueId}`);
    } catch (e: any) {
      setError(e.message || 'Code invalide');
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28, gap: 14 }}
      showsVerticalScrollIndicator={false}
    >
      <BrutalButton
        label="+ Créer une ligue"
        variant="primary"
        onPress={() => router.push('/league/create')}
      />

      {/* Rejoindre par code */}
      <BrutalBox className="gap-2.5 bg-surface-3 p-3.5">
        <Text className="font-ui-semibold text-[11px] text-muted">
          Rejoindre avec un code
        </Text>
        <View className="flex-row gap-2">
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="Ex : K7M2PQ"
            placeholderTextColor="#6B7280"
            autoCapitalize="characters"
            autoCorrect={false}
            className="flex-1 border border-hairline bg-ink px-3 py-2.5 font-ui-medium text-[14px] text-white rounded-xl"
            style={{ letterSpacing: 2 }}
          />
          <Pressable
            onPress={onJoin}
            disabled={joining}
            className="items-center justify-center bg-paper px-5 rounded-xl"
          >
            {joining ? (
              <ActivityIndicator size="small" color="#0A0A0B" />
            ) : (
              <Text className="font-ui-semibold text-[12px] text-ink">OK</Text>
            )}
          </Pressable>
        </View>
        {error ? <Text className="font-ui-semibold text-[10px] text-red">{error}</Text> : null}
      </BrutalBox>

      {/* Mes ligues */}
      {leagues === undefined ? (
        <ActivityIndicator color="#F5F5F4" className="my-8" />
      ) : leagues.length === 0 ? (
        <View className="items-center px-6 py-10">
          <Ionicons name="shield-outline" size={44} color="#6B7280" />
          <Text className="mt-3 text-center font-display text-base text-white">Aucune ligue</Text>
          <Text className="mt-1.5 text-center font-ui-medium text-[11px] text-muted">
            Crée ta ligue et défie tes amis !
          </Text>
        </View>
      ) : (
        leagues.map((l) => (
          <Pressable key={l._id} onPress={() => router.push(`/league/${l._id}`)}>
            <BrutalBox className="flex-row items-center gap-3 bg-surface-3 p-3.5">
              <View
                className="h-11 w-11 items-center justify-center overflow-hidden border border-hairline bg-surface-2 rounded-2xl"
              >
                {l.logoUrl ? (
                  <Image source={{ uri: l.logoUrl }} style={{ width: 40, height: 40 }} contentFit="cover" />
                ) : (
                  <Text className="text-[20px]">{l.emoji || '🏆'}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="font-ui-semibold text-[14px] text-white">
                  {l.name}
                </Text>
                <Text className="font-ui-medium text-[10px] text-muted">
                  {l.memberCount} membre{l.memberCount > 1 ? 's' : ''}
                  {l.isOwner ? ' · admin' : ''}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-display text-[15px]" style={{ color: scoreColor(l.myScore) }}>
                  {fmtScore(l.myScore)}
                </Text>
                <Text className="font-ui-medium text-[9px] text-muted">🪙 depuis l'entrée</Text>
              </View>
            </BrutalBox>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
