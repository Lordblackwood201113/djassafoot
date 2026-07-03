import { useAuth } from '@clerk/expo';
import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { postAuthHref } from '@/store/pendingLeagueStore';
import { usePrefsStore } from '@/store/prefsStore';

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const consentAcceptedAt = usePrefsStore((s) => s.consentAcceptedAt);
  const hasHydrated = usePrefsStore((s) => s.hasHydrated);

  // On attend Clerk ET la réhydratation des prefs avant de router (sinon flash de l'écran d'auth
  // pour un utilisateur déjà connecté, et garde de consentement calculée sur une valeur pas encore lue).
  if (!isLoaded || !hasHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <ActivityIndicator color="#F5F5F4" />
      </View>
    );
  }
  if (isSignedIn) return <Redirect href={postAuthHref() as never} />;
  // Consentement (âge 17+ / CGU) exigé UNIQUEMENT s'il n'a jamais été validé → sinon jamais réaffiché.
  if (consentAcceptedAt == null) return <Redirect href="/onboarding" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A0A0B' },
      }}
    />
  );
}
