import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';

export function scoreColor(n: number) {
  return n > 0 ? '#3FCB86' : n < 0 ? '#E5342B' : '#9AA4CC';
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
      <BrutalBox shadow={false} borderWidth={2} className="gap-2.5 bg-surface-3 p-3.5">
        <Text className="font-mono-bold text-[11px] uppercase text-muted" style={{ letterSpacing: 1 }}>
          Rejoindre avec un code
        </Text>
        <View className="flex-row gap-2">
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="EX : K7M2PQ"
            placeholderTextColor="#6B77A8"
            autoCapitalize="characters"
            autoCorrect={false}
            className="flex-1 border-2 border-white bg-ink px-3 py-2.5 font-mono text-[14px] text-white"
            style={{ borderRadius: 0, letterSpacing: 2 }}
          />
          <Pressable
            onPress={onJoin}
            disabled={joining}
            className="items-center justify-center bg-red px-5"
            style={{ borderRadius: 0 }}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="font-mono-bold text-[12px] text-white">OK</Text>
            )}
          </Pressable>
        </View>
        {error ? <Text className="font-mono-bold text-[10px] uppercase text-red">{error}</Text> : null}
      </BrutalBox>

      {/* Mes ligues */}
      {leagues === undefined ? (
        <ActivityIndicator color="#E5342B" className="my-8" />
      ) : leagues.length === 0 ? (
        <View className="items-center px-6 py-10">
          <Ionicons name="shield-outline" size={44} color="#6B76A8" />
          <Text className="mt-3 text-center font-display text-base uppercase text-white">Aucune ligue</Text>
          <Text className="mt-1.5 text-center font-mono text-[11px] uppercase text-muted">
            Crée ta ligue et défie tes amis !
          </Text>
        </View>
      ) : (
        leagues.map((l) => (
          <Pressable key={l._id} onPress={() => router.push(`/league/${l._id}`)}>
            <BrutalBox
              shadow="#E5342B"
              offset={5}
              borderWidth={2}
              className="flex-row items-center gap-3 bg-surface-3 p-3.5"
            >
              <View
                className="h-11 w-11 items-center justify-center border-2 border-white bg-ink"
                style={{ borderRadius: 0 }}
              >
                <Text className="text-[20px]">{l.emoji || '🏆'}</Text>
              </View>
              <View className="flex-1">
                <Text numberOfLines={1} className="font-mono-bold text-[14px] uppercase text-white">
                  {l.name}
                </Text>
                <Text className="font-mono text-[10px] uppercase text-muted">
                  {l.memberCount} membre{l.memberCount > 1 ? 's' : ''}
                  {l.isOwner ? ' · admin' : ''}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-display text-[15px]" style={{ color: scoreColor(l.myScore) }}>
                  {fmtScore(l.myScore)}
                </Text>
                <Text className="font-mono text-[9px] uppercase text-muted">🪙 depuis l'entrée</Text>
              </View>
            </BrutalBox>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}
