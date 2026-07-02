import { useEffect, useRef } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';

import { Flag } from '@/components/brutal/Flag';

// Arbre de phase finale — NOIR : cartes arrondies hairline, à plat, drapeaux des pays.
// On voit ~2 tours à la fois ; le sélecteur de tour fait défiler jusqu'au tour choisi.
type TeamSlot = { name?: string; rawName?: string; badgeUrl?: string; apiId?: string; code?: string };
type Pairing = {
  id?: string;
  date?: string;
  status?: string;
  homeScore?: number;
  awayScore?: number;
  homePenalty?: number;
  awayPenalty?: number;
  winner?: 'home' | 'away';
  home?: TeamSlot;
  away?: TeamSlot;
};

const ROUNDS: { key: string; label: string; count: number }[] = [
  { key: '16', label: '16e de finale', count: 16 },
  { key: '8', label: '8e de finale', count: 8 },
  { key: 'QF', label: 'Quarts de finale', count: 4 },
  { key: 'DF', label: 'Demi-finales', count: 2 },
  { key: 'F', label: 'Finale', count: 1 },
];

const CARD_W = 200;
const CARD_H = 66;
const COL_GAP = 54;
const PITCH = 112;
const TOP = 44;
const PAD = 16;
const LINE = 'rgba(255,255,255,0.15)';

function TeamRow({
  slot,
  score,
  pen,
  dim,
}: {
  slot?: TeamSlot;
  score?: number;
  pen?: number;
  dim?: boolean;
}) {
  const resolved = !!slot?.name;
  return (
    <View className="flex-row items-center gap-2 px-2 py-[6px]">
      {slot?.rawName ? (
        <Flag name={slot.rawName} size={18} />
      ) : (
        <View style={{ width: 18, height: 18, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
      )}
      <Text
        numberOfLines={1}
        className={`flex-1 font-ui-semibold text-[11px] ${
          resolved ? (dim ? 'text-muted' : 'text-white') : 'text-muted'
        }`}
      >
        {slot?.name ?? slot?.code ?? 'À dét.'}
      </Text>
      {pen != null ? (
        <Text className={`font-ui-semibold text-[9px] ${dim ? 'text-muted-2' : 'text-muted'}`}>({pen})</Text>
      ) : null}
      {score != null ? (
        <Text className={`font-display text-[13px] ${dim ? 'text-muted' : 'text-white'}`}>{score}</Text>
      ) : null}
    </View>
  );
}

export function BracketTree({
  focusRound,
  pairingsByRound = {},
  onOpen,
}: {
  focusRound: string;
  pairingsByRound?: Record<string, Pairing[]>;
  onOpen?: (id: string) => void;
}) {
  const hScroll = useRef<ScrollView>(null);
  const focusIdx = Math.max(0, ROUNDS.findIndex((r) => r.key === focusRound));

  const colX = (r: number) => PAD + r * (CARD_W + COL_GAP);
  const pitch = (r: number) => PITCH * 2 ** r;
  const slotCenter = (r: number, i: number) => TOP + pitch(r) / 2 + i * pitch(r);

  const totalW = colX(ROUNDS.length - 1) + CARD_W + PAD;
  const totalH = slotCenter(0, ROUNDS[0].count - 1) + CARD_H / 2 + 30;

  useEffect(() => {
    const winW = Dimensions.get('window').width;
    hScroll.current?.scrollTo({ x: Math.max(0, colX(focusIdx) + CARD_W / 2 - winW / 2), animated: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusIdx]);

  const lines: { k: string; x: number; y: number; w: number; h: number }[] = [];
  for (let r = 0; r < ROUNDS.length - 1; r++) {
    for (let i = 0; i < ROUNDS[r + 1].count; i++) {
      const yA = slotCenter(r, 2 * i);
      const yB = slotCenter(r, 2 * i + 1);
      const yC = (yA + yB) / 2;
      const rx = colX(r) + CARD_W;
      const mid = rx + COL_GAP / 2;
      lines.push({ k: `ha${r}-${i}`, x: rx, y: yA, w: COL_GAP / 2, h: 1 });
      lines.push({ k: `hb${r}-${i}`, x: rx, y: yB, w: COL_GAP / 2, h: 1 });
      lines.push({ k: `v${r}-${i}`, x: mid, y: Math.min(yA, yB), w: 1, h: Math.abs(yB - yA) });
      lines.push({ k: `hc${r}-${i}`, x: mid, y: yC, w: COL_GAP / 2, h: 1 });
    }
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <ScrollView ref={hScroll} horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: totalW, height: totalH }}>
          {lines.map((l) => (
            <View
              key={l.k}
              style={{ position: 'absolute', left: l.x, top: l.y, width: l.w, height: l.h, backgroundColor: LINE }}
            />
          ))}
          {/* En-tête de colonne par tour (toujours visible, indépendant des dates) */}
          {ROUNDS.map((round, r) => (
            <View
              key={`hdr-${r}`}
              style={{
                position: 'absolute',
                left: colX(r),
                top: 6,
                width: CARD_W,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text
                numberOfLines={1}
                className="font-ui-semibold text-[11px] text-white"
              >
                {round.label}
              </Text>
            </View>
          ))}
          {ROUNDS.map((round, r) =>
            Array.from({ length: round.count }).map((_, i) => {
              const pairing = pairingsByRound[round.key]?.[i];
              const top = pairing?.date;
              const finished = pairing?.status === 'finished';
              const hasScore =
                (pairing?.status === 'live' || finished) &&
                pairing?.homeScore != null &&
                pairing?.awayScore != null;
              const hp = pairing?.homePenalty;
              const ap = pairing?.awayPenalty;
              const penDecided = finished && hp != null && ap != null;
              const homeWon =
                finished &&
                (pairing!.winner === 'home' ||
                  (pairing!.homeScore ?? 0) > (pairing!.awayScore ?? 0) ||
                  (penDecided && hp! > ap!));
              const awayWon =
                finished &&
                (pairing!.winner === 'away' ||
                  (pairing!.awayScore ?? 0) > (pairing!.homeScore ?? 0) ||
                  (penDecided && ap! > hp!));
              const card = (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.1)',
                    backgroundColor: '#151518',
                    borderRadius: 16,
                  }}
                >
                  <TeamRow
                    slot={pairing?.home}
                    score={hasScore ? pairing?.homeScore : undefined}
                    pen={penDecided ? hp : undefined}
                    dim={awayWon}
                  />
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                  <TeamRow
                    slot={pairing?.away}
                    score={hasScore ? pairing?.awayScore : undefined}
                    pen={penDecided ? ap : undefined}
                    dim={homeWon}
                  />
                </View>
              );
              return (
                <View
                  key={`${r}-${i}`}
                  style={{ position: 'absolute', left: colX(r), top: slotCenter(r, i) - CARD_H / 2, width: CARD_W }}
                >
                  {top ? (
                    <Text
                      numberOfLines={1}
                      className="absolute -top-[20px] left-0.5 font-ui-semibold text-[10px] text-muted"
                    >
                      {top}
                    </Text>
                  ) : null}
                  {pairing?.status === 'live' ? (
                    <View className="absolute -top-[21px] right-0.5 flex-row items-center gap-1 rounded-full bg-red px-2 py-0.5">
                      <View className="h-1 w-1 rounded-full bg-white" />
                      <Text className="font-ui-semibold text-[8px] text-white">Live</Text>
                    </View>
                  ) : null}
                  {pairing?.id && onOpen ? (
                    <Pressable onPress={() => onOpen(pairing.id!)}>{card}</Pressable>
                  ) : (
                    card
                  )}
                </View>
              );
            }),
          )}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

export type { Pairing, TeamSlot };
