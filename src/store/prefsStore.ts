import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ThemeMode = 'system' | 'light' | 'dark';
type Lang = 'fr';

interface PrefsState {
  theme: ThemeMode;
  lang: Lang;
  onboardingDone: boolean;
  // Consentement (âge 17+ + CGU/Confidentialité) accepté à l'onboarding : timestamp (ms) ou null.
  consentAcceptedAt: number | null;
  // Vrai une fois le store réhydraté depuis AsyncStorage → évite un flash d'onboarding pour les
  // utilisateurs qui l'ont déjà vu (la valeur persistée arrive de façon asynchrone).
  hasHydrated: boolean;
  setTheme: (theme: ThemeMode) => void;
  setLang: (lang: Lang) => void;
  completeOnboarding: () => void;
  acceptConsent: () => void;
  setHasHydrated: (v: boolean) => void;
}

/**
 * Préférences UI persistées (thème, langue, onboarding, consentement).
 * État CLIENT uniquement — les données serveur (matchs, pronos, jetons) vivent dans Convex.
 */
export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      lang: 'fr',
      onboardingDone: false,
      consentAcceptedAt: null,
      hasHydrated: false,
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      completeOnboarding: () => set({ onboardingDone: true }),
      acceptConsent: () => set({ consentAcceptedAt: Date.now(), onboardingDone: true }),
      setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'djassafoot-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      // hasHydrated ne doit pas être persisté (c'est un état de session).
      partialize: ({ theme, lang, onboardingDone, consentAcceptedAt }) => ({
        theme,
        lang,
        onboardingDone,
        consentAcceptedAt,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
