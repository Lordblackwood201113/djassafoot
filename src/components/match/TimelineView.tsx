import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { frTeam } from '@/lib/teamNames';

export type TimelineEvent = {
  minute?: number;
  type: string; // goal | card | subst | var | other
  detail?: string;
  player?: string;
  playerPhoto?: string;
  assist?: string;
  isHome: boolean;
};

// Icône + couleur selon le type d'événement.
function icon(ev: TimelineEvent): { name: keyof typeof Ionicons.glyphMap; color: string } {
  const d = (ev.detail ?? '').toLowerCase();
  switch (ev.type) {
    case 'goal':
      return { name: 'football', color: '#3FCB86' };
    case 'card':
      return { name: 'square', color: d.includes('red') ? '#E5342B' : '#FFD24A' };
    case 'subst':
      return { name: 'swap-horizontal', color: '#9AA4CC' };
    case 'var':
      return { name: 'videocam', color: '#9AA4CC' };
    default:
      return { name: 'ellipse', color: '#9AA4CC' };
  }
}

const TYPE_LABEL: Record<string, string> = {
  goal: 'But',
  card: 'Carton',
  subst: 'Remplacement',
  var: 'VAR',
  other: 'Événement',
};

function Row({ ev }: { ev: TimelineEvent }) {
  const ic = icon(ev);
  const label = ev.detail || TYPE_LABEL[ev.type] || 'Événement';
  return (
    <View className="flex-row items-center gap-3 border-t-2 border-white/10 py-2.5">
      <View className="w-9 items-center">
        <Text className="font-display text-[14px] text-white">{ev.minute != null ? `${ev.minute}'` : '—'}</Text>
      </View>
      <View
        className="h-8 w-8 items-center justify-center border-2 bg-ink"
        style={{ borderRadius: 0, borderColor: ic.color }}
      >
        <Ionicons name={ic.name} size={16} color={ic.color} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="font-mono-bold text-[13px] uppercase text-white">
          {ev.player ?? label}
        </Text>
        <Text numberOfLines={1} className="font-mono text-[10px] uppercase text-muted">
          {ev.type === 'goal' && ev.assist ? `${label} · passe ${ev.assist}` : label}
        </Text>
      </View>
      {/* Indicateur d'équipe : domicile = rouge à gauche implicite via l'ordre, ici un carré coloré */}
      <View
        className="h-2.5 w-2.5"
        style={{ backgroundColor: ev.isHome ? '#E5342B' : '#FFFFFF' }}
      />
    </View>
  );
}

export function TimelineView({
  timeline,
  homeName,
  awayName,
}: {
  timeline: TimelineEvent[];
  homeName: string;
  awayName: string;
}) {
  return (
    <View>
      {/* Légende domicile / extérieur */}
      <View className="mb-2 flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-1.5">
          <View className="h-2.5 w-2.5 bg-red" />
          <Text className="font-mono text-[10px] uppercase text-muted">{frTeam(homeName)}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Text className="font-mono text-[10px] uppercase text-muted">{frTeam(awayName)}</Text>
          <View className="h-2.5 w-2.5 bg-white" />
        </View>
      </View>
      {timeline.map((ev, i) => (
        <Row key={i} ev={ev} />
      ))}
    </View>
  );
}
