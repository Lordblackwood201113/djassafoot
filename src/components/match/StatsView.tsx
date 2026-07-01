import { Text, View } from 'react-native';

export type MatchStat = { stat: string; home?: string; away?: string };

// Libellés FR des stats TheSportsDB.
const STAT_LABEL: Record<string, string> = {
  'Shots on Goal': 'Tirs cadrés',
  'Shots off Goal': 'Tirs non cadrés',
  'Total Shots': 'Tirs totaux',
  'Blocked Shots': 'Tirs bloqués',
  'Shots insidebox': 'Tirs dans la surface',
  'Shots outsidebox': 'Tirs hors surface',
  Fouls: 'Fautes',
  'Corner Kicks': 'Corners',
  Offsides: 'Hors-jeux',
  'Ball Possession': 'Possession',
  'Yellow Cards': 'Cartons jaunes',
  'Red Cards': 'Cartons rouges',
  'Goalkeeper Saves': 'Arrêts du gardien',
  'Total passes': 'Passes totales',
  'Passes accurate': 'Passes réussies',
  'Passes %': 'Passes (%)',
  expected_goals: 'Buts attendus (xG)',
  goals_prevented: 'Buts évités',
};

function toNum(s?: string): number {
  if (!s) return 0;
  const n = Number(String(s).replace('%', '').trim());
  return Number.isNaN(n) ? 0 : n;
}

function StatRow({ s }: { s: MatchStat }) {
  const label = STAT_LABEL[s.stat] ?? s.stat;
  const h = toNum(s.home);
  const a = toNum(s.away);
  const total = Math.abs(h) + Math.abs(a);
  const homePct = total > 0 ? (Math.abs(h) / total) * 100 : 50;

  return (
    <View className="border-t-2 border-white/10 py-2.5">
      <View className="flex-row items-center justify-between">
        <Text className="w-12 font-display text-[15px] text-white">{s.home ?? '—'}</Text>
        <Text className="flex-1 text-center font-mono-bold text-[11px] uppercase text-muted">
          {label}
        </Text>
        <Text className="w-12 text-right font-display text-[15px] text-white">{s.away ?? '—'}</Text>
      </View>
      {/* Barre proportionnelle domicile (rouge) / extérieur (blanc) */}
      <View className="mt-1.5 h-1.5 flex-row border border-white/20" style={{ borderRadius: 0 }}>
        <View style={{ width: `${homePct}%`, backgroundColor: '#E5342B' }} />
        <View style={{ width: `${100 - homePct}%`, backgroundColor: '#FFFFFF' }} />
      </View>
    </View>
  );
}

export function StatsView({ stats }: { stats: MatchStat[] }) {
  return (
    <View>
      {stats.map((s, i) => (
        <StatRow key={i} s={s} />
      ))}
    </View>
  );
}
