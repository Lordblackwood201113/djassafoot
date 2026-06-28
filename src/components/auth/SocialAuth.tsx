import { useSSO } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const redirectUrl = AuthSession.makeRedirectUri();

export function SocialAuth() {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);

  const run = async (key: 'apple' | 'google', strategy: 'oauth_apple' | 'oauth_google') => {
    if (busy) return;
    setBusy(key);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({ strategy, redirectUrl });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/home');
      }
    } catch {
      // annulation ou erreur OAuth — on reste sur l'écran
    } finally {
      setBusy(null);
    }
  };

  return (
    <View className="w-full gap-3">
      <Pressable
        onPress={() => run('apple', 'oauth_apple')}
        className="w-full flex-row items-center justify-center gap-2.5 rounded-full bg-white px-6 py-4"
      >
        {busy === 'apple' ? (
          <ActivityIndicator color="#0A1230" />
        ) : (
          <>
            <Ionicons name="logo-apple" size={20} color="#0A1230" />
            <Text className="font-ui-bold text-base text-ink">Continuer avec Apple</Text>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={() => run('google', 'oauth_google')}
        className="w-full flex-row items-center justify-center gap-2.5 rounded-full bg-surface px-6 py-4"
      >
        {busy === 'google' ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#ffffff" />
            <Text className="font-ui-bold text-base text-white">Continuer avec Google</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
