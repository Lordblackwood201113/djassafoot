import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import { useMutation } from 'convex/react';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { ScreenBackground } from '@/components/ScreenBackground';
import { hardShadow } from '@/lib/brutal';

const EMOJIS = ['🏆', '⚽', '🔥', '🦁', '🐘', '🌍', '⭐', '💪', '🎯', '👑', '🚀', '💎'];

export default function CreateLeague() {
  const router = useRouter();
  const create = useMutation(api.leagues.create);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏆');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onCreate = async () => {
    if (name.trim().length < 2) {
      setError('Choisis un nom (2 caractères min.)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { leagueId } = await create({ name: name.trim(), emoji });
      router.replace(`/league/${leagueId}`);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground variant="app">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-1 pt-14">
          <View className="flex-row items-center gap-3 px-4 pt-2">
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/leaderboard'))}
              className="h-11 w-11 items-center justify-center border-2 border-white bg-ink"
              style={[{ borderRadius: 0 }, hardShadow('#E5342B', 4)]}
            >
              <Ionicons name="chevron-back" size={24} color="#ffffff" />
            </Pressable>
            <View className="h-3 w-3 bg-red" />
            <Text className="font-display text-2xl uppercase text-white">Nouvelle ligue</Text>
          </View>

          <View className="gap-5 px-6 pt-8">
            {/* Emoji */}
            <View className="items-center gap-3">
              <BrutalBox
                shadow="#E5342B"
                offset={6}
                borderWidth={2.5}
                className="h-20 w-20 items-center justify-center bg-surface-3"
              >
                <Text className="text-[40px]">{emoji}</Text>
              </BrutalBox>
              <View className="flex-row flex-wrap justify-center gap-2">
                {EMOJIS.map((e) => (
                  <Pressable
                    key={e}
                    onPress={() => setEmoji(e)}
                    className="h-10 w-10 items-center justify-center border-2 bg-ink"
                    style={{ borderRadius: 0, borderColor: e === emoji ? '#E5342B' : '#FFFFFF' }}
                  >
                    <Text className="text-[18px]">{e}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Nom */}
            <View className="gap-1.5">
              <Text className="font-mono-bold text-[11px] uppercase text-muted" style={{ letterSpacing: 1 }}>
                Nom de la ligue
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="EX : LES PRONO KINGS"
                placeholderTextColor="#6B77A8"
                maxLength={40}
                autoCapitalize="characters"
                className="w-full border-2 border-white bg-surface-3 px-4 py-3.5 font-mono text-[14px] text-white"
                style={{ borderRadius: 0 }}
              />
            </View>

            {error ? (
              <Text className="font-mono-bold text-[12px] uppercase text-red">{error}</Text>
            ) : null}

            <BrutalButton
              label="Créer la ligue"
              variant="primary"
              onPress={onCreate}
              loading={loading}
            />
            <Text className="text-center font-mono text-[10px] uppercase text-muted" style={{ lineHeight: 15 }}>
              Tu recevras un code à partager pour inviter tes amis.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}
