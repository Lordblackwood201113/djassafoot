import { create } from 'zustand';

export type Market = 'result_1x2' | 'over_under_2_5' | 'btts' | 'exact_score';
export type Leg = { market: Market; pick: string; label: string; odds: number };

// Un pari en cours d'édition (chargé depuis un pari existant, non encore réglé).
export type EditableBet = {
  _id: string;
  matchId: string;
  stake: number;
  legs: { market: Market; pick: string; label: string; odds: number }[];
};

type State = {
  matchId: string | null;
  legs: Record<string, Leg>; // une sélection par marché
  stake: number;
  // Édition : `editingBetId` = pari modifié ; `originalStake` sert au calcul du solde disponible
  // (l'ancienne mise est remboursée). `null`/0 en mode création.
  editingBetId: string | null;
  originalStake: number;
  setMatch: (id: string) => void;
  toggleLeg: (leg: Leg) => void;
  setLeg: (market: Market, leg: Leg | null) => void;
  removeLeg: (market: Market) => void;
  setStake: (n: number) => void;
  loadForEdit: (bet: EditableBet) => void;
  reset: () => void;
};

export const usePronoDraft = create<State>((set) => ({
  matchId: null,
  legs: {},
  stake: 100,
  editingBetId: null,
  originalStake: 0,
  setMatch: (id) =>
    set((s) =>
      s.matchId === id
        ? s
        : { matchId: id, legs: {}, stake: 100, editingBetId: null, originalStake: 0 },
    ),
  toggleLeg: (leg) =>
    set((s) => {
      const legs = { ...s.legs };
      const cur = legs[leg.market];
      if (cur && cur.pick === leg.pick) delete legs[leg.market];
      else legs[leg.market] = leg;
      return { legs };
    }),
  setLeg: (market, leg) =>
    set((s) => {
      const legs = { ...s.legs };
      if (leg) legs[market] = leg;
      else delete legs[market];
      return { legs };
    }),
  removeLeg: (market) =>
    set((s) => {
      const legs = { ...s.legs };
      delete legs[market];
      return { legs };
    }),
  setStake: (n) => set({ stake: Math.max(0, Math.floor(n) || 0) }),
  loadForEdit: (bet) =>
    set({
      matchId: bet.matchId,
      legs: Object.fromEntries(
        bet.legs.map((l) => [
          l.market,
          { market: l.market, pick: l.pick, label: l.label, odds: l.odds },
        ]),
      ),
      stake: bet.stake,
      editingBetId: bet._id,
      originalStake: bet.stake,
    }),
  reset: () => set({ matchId: null, legs: {}, stake: 100, editingBetId: null, originalStake: 0 }),
}));
