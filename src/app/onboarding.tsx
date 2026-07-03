import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutalButton } from '@/components/brutal/BrutalButton';
import { usePrefsStore } from '@/store/prefsStore';

// Pages légales (à héberger — cf. checklist de mise en ligne). Ouvertes dans le navigateur.
const TERMS_URL = 'https://djassafoot.pages.dev/conditions-utilisation';
const PRIVACY_URL = 'https://djassafoot.pages.dev/politique-confidentialite';

type IconName = keyof typeof Ionicons.glyphMap;

const SLIDES: { icon: IconName; glow: string; title: string; sub: string; cta: string }[] = [
  {
    icon: 'football',
    glow: '#E5484D',
    title: 'Pronostique le Mondial 2026',
    sub: 'Tes pronos sur tous les matchs de la Coupe du Monde, réunis en un seul combiné.',
    cta: 'Suivant',
  },
  {
    icon: 'people',
    glow: '#6FA287',
    title: 'Défie tes amis',
    sub: 'Crée des ligues privées et affronte tes potes tout au long du tournoi.',
    cta: 'Suivant',
  },
  {
    icon: 'trophy',
    glow: '#D9C48A',
    title: 'Grimpe au classement',
    sub: 'Gagne des jetons 🪙 à chaque prono réussi. 500 offerts pour bien démarrer.',
    cta: 'Commencer',
  },
];

const CONSENT_STEP = SLIDES.length;

// Badge circulaire avec halo coloré (glow) — fidèle aux maquettes.
function Badge({ icon, glow, size = 186 }: { icon: IconName; glow: string; size?: number }) {
  return (
    <View className="items-center justify-center">
      <View
        style={{
          position: 'absolute',
          width: size + 26,
          height: size + 26,
          borderRadius: 999,
          backgroundColor: glow,
          opacity: 0.14,
        }}
      />
      <View
        className="items-center justify-center rounded-full border border-hairline bg-surface"
        style={{
          width: size,
          height: size,
          shadowColor: glow,
          shadowOpacity: 0.5,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <Ionicons name={icon} size={size * 0.44} color="#F5F5F4" />
      </View>
    </View>
  );
}

function Checkbox({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable onPress={onToggle} className="flex-row items-start gap-3" accessibilityRole="checkbox">
      <View
        className={`mt-0.5 h-6 w-6 items-center justify-center rounded-[7px] border ${
          checked ? 'border-green bg-green' : 'border-hairline bg-surface'
        }`}
      >
        {checked ? <Ionicons name="checkmark" size={15} color="#0A0A0B" /> : null}
      </View>
      <View className="flex-1">{children}</View>
    </Pressable>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const acceptConsent = usePrefsStore((s) => s.acceptConsent);
  const completeOnboarding = usePrefsStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  const [age, setAge] = useState(false);
  const [terms, setTerms] = useState(false);

  const isConsent = step === CONSENT_STEP;
  const canContinue = age && terms;

  const next = () => setStep((s) => Math.min(s + 1, CONSENT_STEP));
  const skip = () => setStep(CONSENT_STEP);

  // Consentement accepté → on mémorise (timestamp) et on file vers l'inscription.
  const acceptAndSignUp = () => {
    if (!canContinue) return;
    acceptConsent();
    router.replace('/sign-up');
  };
  // « Déjà un compte » : on marque l'onboarding vu (pas de consentement requis pour se connecter).
  const goSignIn = () => {
    completeOnboarding();
    router.replace('/sign-in');
  };

  const slide = SLIDES[step] ?? SLIDES[SLIDES.length - 1];

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top }}>
      {/* Barre haute : « Passer » sur les slides, retour sur le consentement */}
      <View className="h-11 flex-row items-center justify-between px-6">
        {isConsent ? (
          <Pressable
            onPress={() => setStep(SLIDES.length - 1)}
            className="h-9 w-9 items-center justify-center rounded-xl border border-hairline bg-surface"
            accessibilityLabel="Retour"
          >
            <Ionicons name="chevron-back" size={20} color="#ffffff" />
          </Pressable>
        ) : (
          <View className="h-9 w-9" />
        )}
        {!isConsent ? (
          <Pressable onPress={skip} hitSlop={10}>
            <Text className="font-ui-semibold text-sm text-muted-2">Passer</Text>
          </Pressable>
        ) : null}
      </View>

      {isConsent ? (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 28,
            paddingTop: 4,
            paddingBottom: insets.bottom + 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center py-6">
            <Badge icon="shield-checkmark" glow="#6FA287" size={112} />
          </View>

          <Text className="font-display text-[26px] text-white">Une dernière étape</Text>
          <Text className="mt-2.5 font-ui-medium text-sm text-muted" style={{ lineHeight: 21 }}>
            Djassa Foot est un jeu de pronostics gratuit. Les jetons sont une monnaie virtuelle : ils
            n&apos;ont aucune valeur réelle et ne sont pas échangeables contre de l&apos;argent.
          </Text>

          <View className="mt-6 gap-4">
            <Checkbox checked={age} onToggle={() => setAge((v) => !v)}>
              <Text className="font-ui-medium text-sm text-[#E4E4E7]" style={{ lineHeight: 20 }}>
                J&apos;ai 17 ans ou plus.
              </Text>
            </Checkbox>

            <Checkbox checked={terms} onToggle={() => setTerms((v) => !v)}>
              <Text className="font-ui-medium text-sm text-muted" style={{ lineHeight: 20 }}>
                J&apos;accepte les{' '}
                <Text
                  className="font-ui-semibold text-paper underline"
                  onPress={() => Linking.openURL(TERMS_URL)}
                >
                  Conditions d&apos;utilisation
                </Text>{' '}
                et la{' '}
                <Text
                  className="font-ui-semibold text-paper underline"
                  onPress={() => Linking.openURL(PRIVACY_URL)}
                >
                  Politique de confidentialité
                </Text>
                .
              </Text>
            </Checkbox>
          </View>

          <View className="flex-1" style={{ minHeight: 32 }} />

          <BrutalButton
            label="Créer mon compte"
            variant="light"
            disabled={!canContinue}
            onPress={acceptAndSignUp}
          />
          <View className="mt-3.5 flex-row items-center justify-center gap-1.5">
            <Text className="font-ui-medium text-[13px] text-muted-2">Déjà un compte ?</Text>
            <Pressable onPress={goSignIn} hitSlop={8}>
              <Text className="font-ui-bold text-[13px] text-paper">Se connecter</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (
        <>
          <View className="flex-1 items-center justify-center px-8">
            <Badge icon={slide.icon} glow={slide.glow} />
          </View>

          <View className="items-center px-8" style={{ paddingBottom: insets.bottom + 28 }}>
            <Text
              className="text-center font-display text-[27px] text-white"
              style={{ lineHeight: 33 }}
            >
              {slide.title}
            </Text>
            <Text
              className="mt-3 text-center font-ui-medium text-sm text-muted"
              style={{ lineHeight: 21 }}
            >
              {slide.sub}
            </Text>

            {/* Points de progression */}
            <View className="mt-6 flex-row items-center gap-[7px]">
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  className={`h-[7px] rounded-full ${i === step ? 'bg-paper' : 'bg-white/20'}`}
                  style={{ width: i === step ? 22 : 7 }}
                />
              ))}
            </View>

            <View className="mt-7 w-full">
              <BrutalButton label={slide.cta} variant="light" onPress={next} />
            </View>
          </View>
        </>
      )}
    </View>
  );
}
