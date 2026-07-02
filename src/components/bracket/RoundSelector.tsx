import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

// Sélecteur de tour façon Apple Sports : rangée de libellés + barre d'icônes (pyramide de barres,
// 🏆 pour la finale) avec une fenêtre blanche glissante sur 2 tours et des chevrons ‹ ›.
type Seg = { key: string; label: string; bars?: number; thick?: boolean; trophy?: boolean };

const SEGS: Seg[] = [
  { key: 'PG', label: 'PG', bars: 4, thick: true },
  { key: '16', label: '16e de finale', bars: 4 },
  { key: '8', label: '8e de finale', bars: 3 },
  { key: 'QF', label: 'QF', bars: 2 },
  { key: 'DF', label: 'DF', bars: 1 },
  { key: 'F', label: 'F', trophy: true },
];
const N = SEGS.length;

function Bars({ seg, on }: { seg: Seg; on: boolean }) {
  const color = on ? '#0A0A0B' : '#A1A1AA';
  if (seg.trophy) return <Ionicons name="trophy" size={20} color={color} />;
  const h = seg.thick ? 3 : 2;
  const w = seg.thick ? 19 : 16;
  return (
    <View style={{ gap: 3 }}>
      {Array.from({ length: seg.bars ?? 1 }).map((_, i) => (
        <View key={i} style={{ width: w, height: h, borderRadius: 2, backgroundColor: color }} />
      ))}
    </View>
  );
}

export function RoundSelector({
  activeKey,
  onChange,
}: {
  activeKey: string;
  onChange: (key: string) => void;
}) {
  const active = Math.max(0, SEGS.findIndex((s) => s.key === activeKey));
  const start = Math.min(active, N - 2); // fenêtre = [start, start+1]
  const inWindow = (i: number) => i === start || i === start + 1;
  const pct = (n: number) => `${(n / N) * 100}%` as const;
  const step = (d: number) => onChange(SEGS[Math.min(N - 1, Math.max(0, active + d))].key);

  return (
    <View className="mx-4 mb-1">
      {/* Libellés */}
      <View className="mb-2 flex-row">
        {SEGS.map((s, i) => (
          <Pressable key={s.key} onPress={() => onChange(s.key)} className="flex-1 px-0.5">
            <Text
              numberOfLines={2}
              className={`text-center text-[12px] leading-[15px] ${
                inWindow(i) ? 'font-ui-bold text-white' : 'font-ui-medium text-muted'
              }`}
            >
              {s.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Barre d'icônes */}
      <View className="h-[58px] justify-center overflow-hidden rounded-2xl bg-surface">
        {/* Fenêtre blanche glissante */}
        <View
          style={{ position: 'absolute', top: 6, bottom: 6, left: pct(start), width: pct(2), backgroundColor: '#F5F5F4', borderRadius: 13 }}
        />
        {/* Icônes */}
        <View className="flex-row">
          {SEGS.map((s, i) => (
            <Pressable key={s.key} onPress={() => onChange(s.key)} className="flex-1 items-center justify-center">
              <Bars seg={s} on={inWindow(i)} />
            </Pressable>
          ))}
        </View>
        {/* Chevrons aux bords de la fenêtre */}
        <Pressable
          onPress={() => step(-1)}
          style={{ position: 'absolute', top: 0, bottom: 0, left: pct(start), width: 26, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-back" size={15} color="#0A0A0B" />
        </Pressable>
        <Pressable
          onPress={() => step(1)}
          style={{ position: 'absolute', top: 0, bottom: 0, right: pct(N - (start + 2)), width: 26, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="chevron-forward" size={15} color="#0A0A0B" />
        </Pressable>
      </View>
    </View>
  );
}
