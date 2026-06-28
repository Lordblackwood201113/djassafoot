import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type ThemeMode = 'system' | 'light' | 'dark';
type Lang = 'fr';

interface PrefsState {
  theme: ThemeMode;
  lang: Lang;
  onboardingDone: boolean;
  setTheme: (theme: ThemeMode) => void;
  setLang: (lang: Lang) => void;
  completeOnboarding: () => void;
}

/**
 * Préférences UI persistées (thème, langue, onboarding).
 * État CLIENT uniquement — les données serveur (matchs, pronos, flammes) vivent dans Convex.
 */
export const usePrefsStore = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      lang: 'fr',
      onboardingDone: false,
      setTheme: (theme) => set({ theme }),
      setLang: (lang) => set({ lang }),
      completeOnboarding: () => set({ onboardingDone: true }),
    }),
    {
      name: 'djassafoot-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
