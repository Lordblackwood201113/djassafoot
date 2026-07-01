import { useAuth } from '@clerk/expo';
import { Redirect, Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { setPendingLeague } from '@/store/pendingLeagueStore';

export default function AppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();

  // Lien d'invitation à une ligue ouvert sans être connecté → on retient le code avant
  // la redirection vers l'accueil, pour y revenir automatiquement après connexion.
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const m = pathname.match(/^\/league\/join\/([^/?#]+)/);
      if (m) setPendingLeague(decodeURIComponent(m[1]));
    }
  }, [isLoaded, isSignedIn, pathname]);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-blue-bottom">
        <ActivityIndicator color="#E5342B" />
      </View>
    );
  }

  if (!isSignedIn) return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0A1230' },
      }}
    />
  );
}
