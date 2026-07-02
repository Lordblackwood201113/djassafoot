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
      return { name: 'football', color: '#6FA287' };
    case 'card':
      return { name: 'square', color: d.includes('red') ? '#E5484D' : '#FFD24A' };
    case 'subst':
      return { name: 'swap-horizontal', color: '#A1A1AA' };
    case 'var':
      return { name: 'videocam', color: '#A1A1AA' };
    default:
      return { name: 'ellipse', color: '#A1A1AA' };
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
    <View className="flex-row items-center gap-3 border-t border-line py-2.5">
      <View className="w-9 items-center">
        <Text className="font-display text-[14px] text-white">{ev.minute != null ? `${ev.minute}'` : '—'}</Text>
      </View>
      <View
        className="h-8 w-8 items-center justify-center rounded-[13px] border bg-surface-2"
        style={{ borderColor: ic.color }}
      >
        <Ionicons name={ic.name} size={16} color={ic.color} />
      </View>
      <View className="flex-1">
        <Text numberOfLines={1} className="font-ui-semibold text-[13px] text-white">
          {ev.player ?? label}
        </Text>
        <Text numberOfLines={1} className="font-ui-medium text-[10px] text-muted">
          {ev.type === 'goal' && ev.assist ? `${label} · passe ${ev.assist}` : label}
        </Text>
      </View>
      {/* Indicateur d'équipe : domicile = point plein, extérieur = point discret */}
      <View
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: ev.isHome ? '#F5F5F4' : '#6B7280' }}
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
          <View className="h-2.5 w-2.5 rounded-full bg-paper" />
          <Text className="font-ui-medium text-[10px] text-muted">{frTeam(homeName)}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Text className="font-ui-medium text-[10px] text-muted">{frTeam(awayName)}</Text>
          <View className="h-2.5 w-2.5 rounded-full bg-muted-2" />
        </View>
      </View>
      {timeline.map((ev, i) => (
        <Row key={i} ev={ev} />
      ))}
    </View>
  );
}
