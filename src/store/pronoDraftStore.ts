import { create } from 'zustand';

export type Market = 'result_1x2' | 'over_under_2_5' | 'btts' | 'exact_score';
export type Leg = { market: Market; pick: string; label: string; odds: number };

type State = {
  matchId: string | null;
  legs: Record<string, Leg>; // une sélection par marché
  stake: number;
  setMatch: (id: string) => void;
  toggleLeg: (leg: Leg) => void;
  setLeg: (market: Market, leg: Leg | null) => void;
  removeLeg: (market: Market) => void;
  setStake: (n: number) => void;
  reset: () => void;
};

export const usePronoDraft = create<State>((set) => ({
  matchId: null,
  legs: {},
  stake: 100,
  setMatch: (id) =>
    set((s) => (s.matchId === id ? s : { matchId: id, legs: {}, stake: 100 })),
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
  reset: () => set({ matchId: null, legs: {}, stake: 100 }),
}));
