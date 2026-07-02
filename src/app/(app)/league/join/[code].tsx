import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import { useMutation, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { ScreenBackground } from '@/components/ScreenBackground';
import { clearPendingLeague } from '@/store/pendingLeagueStore';

export default function JoinLeague() {
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const norm = (code ?? '').toUpperCase();
  const preview = useQuery(api.leagues.byCode, norm ? { code: norm } : 'skip');
  const joinByCode = useMutation(api.leagues.joinByCode);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  // On est arrivé sur le lien d'invitation → on efface le code en attente (fin du parcours).
  useEffect(() => {
    clearPendingLeague();
  }, []);

  const onJoin = async () => {
    setJoining(true);
    setError('');
    try {
      const { leagueId } = await joinByCode({ code: norm });
      router.replace(`/league/${leagueId}`);
    } catch (e: any) {
      setError(e.message || 'Impossible de rejoindre');
      setJoining(false);
    }
  };

  return (
    <ScreenBackground variant="app">
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="px-4 pt-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/leaderboard'))}
            className="h-11 w-11 items-center justify-center rounded-[13px] border border-hairline bg-surface-2"
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <Text className="font-ui-semibold text-[11px] text-muted">
            Invitation à une ligue
          </Text>

          {preview === undefined ? (
            <Text className="mt-6 font-ui-semibold text-sm text-muted">Chargement…</Text>
          ) : preview === null ? (
            <View className="mt-6 items-center gap-2">
              <BrutalBox className="h-20 w-20 items-center justify-center rounded-2xl bg-surface-2">
                <Ionicons name="alert" size={40} color="#E5484D" />
              </BrutalBox>
              <Text className="mt-2 text-center font-display text-xl text-white">Code invalide</Text>
              <Text className="text-center font-ui-medium text-[11px] text-muted">
                Cette ligue n'existe pas ou le lien est erroné.
              </Text>
            </View>
          ) : (
            <>
              <BrutalBox className="mt-6 h-24 w-24 items-center justify-center rounded-2xl bg-surface-2">
                <Text className="text-[44px]">{preview.emoji || '🏆'}</Text>
              </BrutalBox>
              <Text className="mt-6 text-center font-display text-3xl text-white">
                {preview.name}
              </Text>
              <Text className="mt-2 font-ui-medium text-[12px] text-muted">
                {preview.memberCount} membre{preview.memberCount > 1 ? 's' : ''} · code {norm}
              </Text>
              {error ? (
                <Text className="mt-4 font-ui-semibold text-[12px] text-red">{error}</Text>
              ) : null}
            </>
          )}
        </View>

        {preview ? (
          <View className="gap-3 px-6 pb-10">
            <BrutalButton label="Rejoindre la ligue" variant="primary" onPress={onJoin} loading={joining} />
            <BrutalButton
              label="Plus tard"
              variant="ghost"
              onPress={() => router.replace('/leaderboard')}
            />
          </View>
        ) : null}
      </View>
    </ScreenBackground>
  );
}
