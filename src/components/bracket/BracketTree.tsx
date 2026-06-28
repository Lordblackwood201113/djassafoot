import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';

// Arbre de phase finale — cartes PLEINE TAILLE, bracket horizontal classique (style Apple Sports).
// On voit ~2 tours à la fois ; le sélecteur de tour fait défiler jusqu'au tour choisi.
type TeamSlot = { name?: string; badgeUrl?: string; code?: string };
type Pairing = { id?: string; date?: string; home?: TeamSlot; away?: TeamSlot };

const ROUNDS: { key: string; label: string; count: number }[] = [
  { key: '16', label: '16e de finale', count: 16 },
  { key: '8', label: '8e de finale', count: 8 },
  { key: 'QF', label: 'Quarts de finale', count: 4 },
  { key: 'DF', label: 'Demi-finales', count: 2 },
  { key: 'F', label: 'Finale', count: 1 },
];

const CARD_W = 196;
const CARD_H = 64;
const COL_GAP = 52;
const PITCH = 108; // espacement vertical entre 2 matchs d'un 16e (assez d'air pour la date au-dessus)
const TOP = 40;
const PAD = 16;
const LINE = '#FFFFFF2E';

function TeamRow({ slot }: { slot?: TeamSlot }) {
  const resolved = !!slot?.name;
  return (
    <View className="flex-row items-center gap-2.5 py-[7px]">
      {slot?.badgeUrl ? (
        <Image source={{ uri: slot.badgeUrl }} style={{ width: 22, height: 22, borderRadius: 11 }} contentFit="cover" />
      ) : (
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#2A3568' }} />
      )}
      <Text
        numberOfLines={1}
        className={`flex-shrink text-[14px] ${resolved ? 'font-ui-semibold text-white' : 'font-ui-medium text-muted'}`}
      >
        {slot?.name ?? slot?.code ?? 'À dét.'}
      </Text>
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
      lines.push({ k: `ha${r}-${i}`, x: rx, y: yA, w: COL_GAP / 2, h: 1.5 });
      lines.push({ k: `hb${r}-${i}`, x: rx, y: yB, w: COL_GAP / 2, h: 1.5 });
      lines.push({ k: `v${r}-${i}`, x: mid, y: Math.min(yA, yB), w: 1.5, h: Math.abs(yB - yA) });
      lines.push({ k: `hc${r}-${i}`, x: mid, y: yC, w: COL_GAP / 2, h: 1.5 });
    }
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <ScrollView ref={hScroll} horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: totalW, height: totalH }}>
          {lines.map((l) => (
            <View
              key={l.k}
              style={{ position: 'absolute', left: l.x, top: l.y, width: l.w, height: l.h, backgroundColor: LINE, borderRadius: 1 }}
            />
          ))}
          {ROUNDS.map((round, r) =>
            Array.from({ length: round.count }).map((_, i) => {
              const pairing = pairingsByRound[round.key]?.[i];
              const top = pairing?.date ?? (i === 0 ? round.label : undefined);
              const card = (
                <View
                  style={{ borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#1A2456', paddingHorizontal: 12 }}
                >
                  <TeamRow slot={pairing?.home} />
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />
                  <TeamRow slot={pairing?.away} />
                </View>
              );
              return (
                <View
                  key={`${r}-${i}`}
                  style={{ position: 'absolute', left: colX(r), top: slotCenter(r, i) - CARD_H / 2, width: CARD_W }}
                >
                  {top ? (
                    <Text numberOfLines={1} className="absolute -top-[18px] left-1 font-ui text-[11px] text-muted">
                      {top}
                    </Text>
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

export type { Pairing };
