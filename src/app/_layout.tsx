import '@/global.css';

import { ClerkProvider, useAuth } from '@clerk/expo';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { tokenCache } from '@clerk/expo/token-cache';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from '@expo-google-fonts/sora';
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from '@expo-google-fonts/space-mono';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalyticsBridge } from '@/components/AnalyticsBridge';
import { initAnalytics } from '@/lib/analytics';

// Nettoie une variable d'env : les dashboards d'hébergeur (Cloudflare, etc.) enregistrent parfois
// la valeur AVEC des guillemets ou des espaces parasites → on les retire pour éviter une clé/URL
// invalide (qui ferait planter le boot = page blanche).
const cleanEnv = (v?: string) => {
  const s = v?.trim().replace(/^['"]+|['"]+$/g, '').trim();
  return s ? s : undefined;
};

const CONVEX_URL = cleanEnv(process.env.EXPO_PUBLIC_CONVEX_URL);
const CLERK_KEY = cleanEnv(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);

const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL, { unsavedChangesWarning: false }) : null;

SplashScreen.preventAutoHideAsync();

// Écran d'erreur explicite (au lieu d'une page blanche) si une variable manque au build.
function ConfigError({ missing }: { missing: string[] }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0A1230', alignItems: 'center', justifyContent: 'center', padding: 28 }}>
      <Text style={{ color: '#E5342B', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
        Configuration manquante
      </Text>
      <Text style={{ color: '#FFFFFF', fontSize: 13, marginTop: 12, textAlign: 'center' }}>
        Variable(s) d&apos;environnement absente(s) au build :
      </Text>
      <Text style={{ color: '#9AA4CC', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
        {missing.join('\n')}
      </Text>
      <Text style={{ color: '#6B76A8', fontSize: 11, marginTop: 18, textAlign: 'center', lineHeight: 16 }}>
        Ajoute-les dans l&apos;hébergeur (sans guillemets) puis relance un déploiement — les
        variables EXPO_PUBLIC_* sont figées au moment du build.
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
    // Polices d'icônes (sinon tab bar / retour / cloche s'affichent en carrés sur le web).
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    try {
      initAnalytics();
    } catch {
      /* l'analytics ne doit jamais casser le démarrage */
    }
  }, []);

  // Si les polices échouent (réseau/CDN), on affiche quand même l'app (polices système).
  if (!fontsLoaded && !fontError) return null;

  if (!convex || !CLERK_KEY) {
    return (
      <ConfigError
        missing={[
          ...(convex ? [] : ['EXPO_PUBLIC_CONVEX_URL']),
          ...(CLERK_KEY ? [] : ['EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY']),
        ]}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={CLERK_KEY} tokenCache={tokenCache}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <AnalyticsBridge />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0A1230' },
            }}
          />
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
