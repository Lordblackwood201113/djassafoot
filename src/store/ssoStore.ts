import { create } from 'zustand';

/**
 * État ÉPHÉMÈRE du flux SSO (OAuth Google/Apple). Pendant la finalisation (retour du
 * navigateur → activation de la session Clerk), le deep link `djassafoot://` fait naviguer
 * expo-router vers `/` : sans ce flag, l'écran d'accueil déconnecté « flashe » 1-2 s avant
 * la redirection vers /home. `index.tsx` affiche le loader tant que `inProgress` est vrai.
 */
interface SsoState {
  inProgress: boolean;
  setInProgress: (v: boolean) => void;
}

export const useSsoStore = create<SsoState>((set) => ({
  inProgress: false,
  setInProgress: (v) => set({ inProgress: v }),
}));
