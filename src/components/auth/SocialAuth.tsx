import { useSSO } from '@clerk/expo';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';

import { postAuthHref } from '@/store/pendingLeagueStore';
import { useSsoStore } from '@/store/ssoStore';

WebBrowser.maybeCompleteAuthSession();

const redirectUrl = AuthSession.makeRedirectUri();

export function SocialAuth() {
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const [err, setErr] = useState('');

  const run = async (key: 'apple' | 'google', strategy: 'oauth_apple' | 'oauth_google') => {
    if (busy) return;
    setBusy(key);
    setErr('');
    // Anti-flash : index.tsx affiche le loader (pas l'écran « Commencer ») tant que le SSO finalise.
    useSsoStore.getState().setInProgress(true);

    // RATTRAPAGE ANDROID (singleTask) : quand Chrome tire `djassafoot://?rotating_token_nonce=…`,
    // l'app redevient active AVANT que l'événement URL n'atteigne le JS → le Promise.race
    // d'expo-web-browser résout « dismiss » et désabonne SON listener. On garde donc NOTRE
    // propre listener (jamais désabonné par la course) pour capturer l'URL et finaliser
    // le flux à la main si besoin.
    let capturedUrl = '';
    const sub = Linking.addEventListener('url', (e) => {
      if (e.url && e.url.includes('rotating_token_nonce')) capturedUrl = e.url;
    });

    try {
      console.log('[SSO] début', strategy, '· redirectUrl =', redirectUrl);
      const res = await startSSOFlow({
        strategy,
        redirectUrl,
        authSessionOptions: { showInRecents: true },
      });

      if (res.createdSessionId && res.setActive) {
        await res.setActive({ session: res.createdSessionId });
        router.replace(postAuthHref() as never);
        return;
      }

      // Chemin nominal perdu (dismiss) → on attend l'événement URL (il arrive juste après),
      // puis on rejoue la fin du flux comme useSSO l'aurait fait : reload(nonce) → transfer → setActive.
      for (let i = 0; i < 10 && !capturedUrl; i++) {
        await new Promise((r) => setTimeout(r, 300));
      }
      const nonceMatch = capturedUrl.match(/[?&]rotating_token_nonce=([^&#]+)/);
      if (nonceMatch && res.signIn) {
        console.log('[SSO] rattrapage : nonce capturé, finalisation manuelle');
        await res.signIn.reload({ rotatingTokenNonce: decodeURIComponent(nonceMatch[1]) });

        if (res.signIn.firstFactorVerification?.status === 'transferable' && res.signUp) {
          // Nouvel utilisateur (pas de compte pour cette identité Google) → transfert vers signUp.
          await res.signUp.create({ transfer: true });
        }
        const sessionId = res.signUp?.createdSessionId ?? res.signIn.createdSessionId;
        if (sessionId && res.setActive) {
          await res.setActive({ session: sessionId });
          console.log('[SSO] rattrapage OK, session active');
          router.replace(postAuthHref() as never);
          return;
        }
      }

      // Toujours rien : soit annulation volontaire (pas d'URL capturée → silencieux),
      // soit vrai échec (URL capturée mais pas de session → message).
      if (capturedUrl) {
        console.log('[SSO] échec après rattrapage', res.signIn?.status, res.signUp?.status);
        setErr('La connexion n’a pas pu être finalisée. Réessaie.');
      } else {
        console.log('[SSO] annulé (aucune URL de retour)');
      }
    } catch (e: any) {
      console.log('[SSO] erreur', e?.message);
      setErr(e?.message ? `Erreur : ${e.message}` : 'Erreur de connexion.');
    } finally {
      sub.remove();
      setBusy(null);
      useSsoStore.getState().setInProgress(false);
    }
  };

  return (
    <View className="w-full gap-3">
      <Pressable
        onPress={() => run('apple', 'oauth_apple')}
        className="w-full flex-row items-center justify-center gap-2.5 rounded-xl bg-paper px-6 py-3.5"
      >
        {busy === 'apple' ? (
          <ActivityIndicator color="#0A0A0B" />
        ) : (
          <>
            <Ionicons name="logo-apple" size={20} color="#0A0A0B" />
            <Text className="font-ui-semibold text-[14px] text-ink">
              Continuer avec Apple
            </Text>
          </>
        )}
      </Pressable>

      <Pressable
        onPress={() => run('google', 'oauth_google')}
        className="w-full flex-row items-center justify-center gap-2.5 rounded-xl border border-hairline bg-surface px-6 py-3.5"
      >
        {busy === 'google' ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color="#ffffff" />
            <Text className="font-ui-semibold text-[14px] text-white">
              Continuer avec Google
            </Text>
          </>
        )}
      </Pressable>

      {err ? (
        <Text className="text-center font-ui-medium text-[11px] text-red">{err}</Text>
      ) : null}
    </View>
  );
}
