import { useSSO } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { hardShadow } from '@/lib/brutal';
import { postAuthHref } from '@/store/pendingLeagueStore';

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
        router.replace(postAuthHref() as never);
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
        className="w-full flex-row items-center justify-center gap-2.5 border-2 border-white bg-white px-6 py-3.5"
        style={[{ borderRadius: 0 }, hardShadow('#0A1230', 4)]}
      >
        {busy === 'apple' ? (
          <ActivityIndicator color="#0A1230" />
        ) : (
          <>
            <Ionicons name="logo-apple" size={20} color="#0A1230" />
            <Text className="font-display text-[14px] uppercase text-ink" style={{ letterSpacing: 0.5 }}>
              Continuer avec Apple
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={() => run('google', 'oauth_google')}
        className="w-full flex-row items-center justify-center gap-2.5 border-2 border-white bg-surface-3 px-6 py-3.5"
        style={[{ borderRadius: 0 }, hardShadow('#E5342B', 4)]}
      >
        {busy === 'google' ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#ffffff" />
            <Text className="font-display text-[14px] uppercase text-white" style={{ letterSpacing: 0.5 }}>
              Continuer avec Google
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}
