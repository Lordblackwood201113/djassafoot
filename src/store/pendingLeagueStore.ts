import { create } from 'zustand';

// Mémorise le code de ligue d'un lien d'invitation ouvert AVANT connexion,
// pour y revenir automatiquement une fois l'utilisateur authentifié.
type State = {
  code: string | null;
  setCode: (c: string | null) => void;
};

export const usePendingLeague = create<State>((set) => ({
  code: null,
  setCode: (code) => set({ code }),
}));

export function setPendingLeague(code: string) {
  usePendingLeague.getState().setCode(code);
}

export function clearPendingLeague() {
  usePendingLeague.getState().setCode(null);
}

// Destination après connexion : la ligue en attente si un lien a été ouvert, sinon l'accueil.
export function postAuthHref(): string {
  const code = usePendingLeague.getState().code;
  return code ? `/league/join/${code}` : '/home';
}
