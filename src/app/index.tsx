import { useAuth } from '@clerk/expo';
import { Image } from 'expo-image';
import { Redirect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { ScreenBackground } from '@/components/ScreenBackground';

const logo = require('../../assets/logo/djassafoot.png');

// Grille de logos compétitions / drapeaux (3 rangées, opacité dégradée) — fidèle au design Pencil.
const ROWS = [
  {
    opacity: 0.55,
    imgs: [
      require('../../assets/leagues/worldcup.png'),
      require('../../assets/flags/argentine.png'),
      require('../../assets/leagues/ucl.png'),
      require('../../assets/flags/maroc.png'),
    ],
  },
  {
    opacity: 0.8,
    imgs: [
      require('../../assets/leagues/premierleague.png'),
      require('../../assets/flags/cote-divoire.png'),
      require('../../assets/leagues/laliga.png'),
      require('../../assets/flags/bresil.png'),
    ],
  },
  {
    opacity: 1,
    imgs: [
      require('../../assets/leagues/seriea.png'),
      require('../../assets/flags/france.png'),
      require('../../assets/leagues/ligue1.png'),
      require('../../assets/flags/allemagne.png'),
    ],
  },
];

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  if (!isLoaded) {
    return (
      <ScreenBackground variant="hero">
        <View className="flex-1 items-center justify-center">
          <Image source={logo} style={{ width: 240, height: 45 }} contentFit="contain" />
          <ActivityIndicator color="#E5342B" style={{ marginTop: 24 }} />
        </View>
      </ScreenBackground>
    );
  }

  if (isSignedIn) return <Redirect href="/home" />;

  return (
    <ScreenBackground variant="hero">
      <View className="flex-1 pt-14">
        {/* Header — logo aligné à gauche */}
        <View className="px-6 pb-2 pt-2">
          <Image
            source={logo}
            style={{ width: 132, height: 25 }}
            contentFit="contain"
            accessibilityLabel="Djassa Foot"
          />
        </View>

        {/* Hero centré */}
        <View className="flex-1 items-center justify-center px-9">
          <View className="gap-3.5">
            {ROWS.map((row, i) => (
              <View
                key={i}
                className="flex-row justify-center gap-3.5"
                style={{ opacity: row.opacity }}
              >
                {row.imgs.map((src, j) => (
                  <Image
                    key={j}
                    source={src}
                    style={{ width: 48, height: 48, borderRadius: 24 }}
                    contentFit="cover"
                  />
                ))}
              </View>
            ))}
          </View>

          <Text
            className="mt-8 text-center font-display text-3xl text-white"
            style={{ lineHeight: 35 }}
          >
            Vos pronos, entre amis
          </Text>
          <Text
            className="mt-4 text-center font-ui text-base text-muted"
            style={{ lineHeight: 22 }}
          >
            Pronostique les scores de la Coupe du Monde et grimpe au classement avec tes potes.
          </Text>
        </View>

        {/* Footer — CTA blanc + lien connexion */}
        <View className="gap-1.5 px-6 pb-11">
          <Pressable
            onPress={() => router.push('/sign-up')}
            className="w-full items-center rounded-full bg-white px-6 py-4"
          >
            <Text className="font-ui-bold text-[17px] text-ink">Commencer</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/sign-in')}
            className="w-full items-center px-6 py-3.5"
          >
            <Text className="font-ui-semibold text-base text-muted">{"J'ai déjà un compte"}</Text>
          </Pressable>
        </View>
      </View>
    </ScreenBackground>
  );
}
