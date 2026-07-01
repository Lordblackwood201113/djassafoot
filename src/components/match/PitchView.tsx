import { Text, View } from 'react-native';

import { Flag } from '@/components/brutal/Flag';
import type { LineupPlayer } from '@/components/match/LineupView';
import { frTeam } from '@/lib/teamNames';

const PITCH_HEIGHT = 470;

function surname(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[parts.length - 1] || name).toUpperCase();
}

// Place les titulaires d'une équipe à partir du `grid` API-Football ("ligne:colonne").
// Domicile en bas (gardien 96%), extérieur en haut (gardien 4%).
function placed(players: LineupPlayer[], isHome: boolean) {
  const byRow: Record<number, LineupPlayer[]> = {};
  for (const p of players) {
    const r = Number((p.grid ?? '1:1').split(':')[0]) || 1;
    (byRow[r] ??= []).push(p);
  }
  const rows = Object.keys(byRow)
    .map(Number)
    .sort((a, b) => a - b);
  const maxRow = rows[rows.length - 1] || 1;

  const out: { p: LineupPlayer; x: number; y: number }[] = [];
  for (const r of rows) {
    const line = byRow[r].sort(
      (a, b) => Number((a.grid ?? '1:1').split(':')[1]) - Number((b.grid ?? '1:1').split(':')[1]),
    );
    line.forEach((p, i) => {
      const x = ((i + 1) / (line.length + 1)) * 100;
      const t = maxRow > 1 ? (r - 1) / (maxRow - 1) : 0; // 0 = gardien, 1 = plus avancé
      // On garde les joueurs à l'écart des bords haut/bas pour que les noms tiennent.
      const y = isHome ? 92 - t * 40 : 8 + t * 40;
      out.push({ p, x, y });
    });
  }
  return out;
}

function Jersey({ p, x, y, isHome }: { p: LineupPlayer; x: number; y: number; isHome: boolean }) {
  return (
    <View
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        width: 58,
        marginLeft: -29,
        marginTop: -13,
        alignItems: 'center',
      }}
    >
      <View
        className="items-center justify-center border-2 border-white"
        style={{ width: 26, height: 26, borderRadius: 0, backgroundColor: isHome ? '#E5342B' : '#FFFFFF' }}
      >
        <Text
          className="font-display text-[11px]"
          style={{ color: isHome ? '#FFFFFF' : '#0A1230' }}
        >
          {p.number ?? ''}
        </Text>
      </View>
      <View
        style={{ marginTop: 3, maxWidth: 66, backgroundColor: '#0A1230E6', paddingHorizontal: 4, paddingVertical: 1 }}
      >
        <Text
          numberOfLines={1}
          className="font-mono-bold text-[8px] uppercase text-white"
          style={{ letterSpacing: 0.3 }}
        >
          {surname(p.name)}
        </Text>
      </View>
    </View>
  );
}

function SubsList({ name, subs }: { name: string; subs: LineupPlayer[] }) {
  if (!subs.length) return null;
  return (
    <View className="flex-1">
      <View className="mb-1 flex-row items-center gap-1.5">
        <Flag name={name} size={16} />
        <Text className="font-mono-bold text-[10px] uppercase text-muted" style={{ letterSpacing: 0.5 }}>
          {frTeam(name)}
        </Text>
      </View>
      {subs.map((p, i) => (
        <Text key={i} numberOfLines={1} className="font-mono text-[10px] uppercase text-white/80">
          {p.number != null ? `${p.number}  ` : ''}
          {p.name}
        </Text>
      ))}
    </View>
  );
}

export function PitchView({
  lineup,
  homeName,
  awayName,
  homeFormation,
  awayFormation,
}: {
  lineup: LineupPlayer[];
  homeName: string;
  awayName: string;
  homeFormation?: string;
  awayFormation?: string;
}) {
  const homeXI = placed(
    lineup.filter((p) => p.isHome && !p.isSub && p.grid),
    true,
  );
  const awayXI = placed(
    lineup.filter((p) => !p.isHome && !p.isSub && p.grid),
    false,
  );
  const homeSubs = lineup.filter((p) => p.isHome && p.isSub);
  const awaySubs = lineup.filter((p) => !p.isHome && p.isSub);

  return (
    <View className="gap-4">
      {/* Bandeau équipes + formations */}
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <Flag name={awayName} size={20} />
          <Text numberOfLines={1} className="font-mono-bold text-[11px] uppercase text-white">
            {frTeam(awayName)}
          </Text>
          {awayFormation ? (
            <Text className="font-mono text-[10px] text-muted">{awayFormation}</Text>
          ) : null}
        </View>
      </View>

      {/* Terrain */}
      <View
        className="w-full overflow-hidden border-2 border-white"
        style={{ height: PITCH_HEIGHT, borderRadius: 0, backgroundColor: '#123522' }}
      >
        {/* Pelouse tondue (bandes alternées) */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={`band${i}`}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: (PITCH_HEIGHT / 6) * i,
              height: PITCH_HEIGHT / 6,
              backgroundColor: i % 2 ? '#16422B' : '#123522',
            }}
          />
        ))}

        {/* Lignes du terrain */}
        <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.45)' }} />
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 76,
            height: 76,
            marginLeft: -38,
            marginTop: -38,
            borderWidth: 2,
            borderColor: 'rgba(255,255,255,0.45)',
            borderRadius: 38,
          }}
        />
        <View style={{ position: 'absolute', top: '50%', left: '50%', width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' }} />
        {/* Surfaces de réparation + 6 mètres */}
        <View style={{ position: 'absolute', top: 0, left: '50%', width: 100, height: 44, marginLeft: -50, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
        <View style={{ position: 'absolute', top: 0, left: '50%', width: 50, height: 18, marginLeft: -25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)' }} />
        <View style={{ position: 'absolute', bottom: 0, left: '50%', width: 100, height: 44, marginLeft: -50, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }} />
        <View style={{ position: 'absolute', bottom: 0, left: '50%', width: 50, height: 18, marginLeft: -25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)' }} />

        {awayXI.map(({ p, x, y }, i) => (
          <Jersey key={`a${i}`} p={p} x={x} y={y} isHome={false} />
        ))}
        {homeXI.map(({ p, x, y }, i) => (
          <Jersey key={`h${i}`} p={p} x={x} y={y} isHome />
        ))}
      </View>

      {/* Bandeau domicile sous le terrain */}
      <View className="flex-row items-center gap-2">
        <Flag name={homeName} size={20} />
        <Text numberOfLines={1} className="font-mono-bold text-[11px] uppercase text-white">
          {frTeam(homeName)}
        </Text>
        {homeFormation ? <Text className="font-mono text-[10px] text-muted">{homeFormation}</Text> : null}
      </View>

      {/* Remplaçants */}
      {homeSubs.length + awaySubs.length > 0 ? (
        <View className="mt-1 border-t-2 border-white/15 pt-3">
          <View className="mb-2 flex-row items-center gap-1.5">
            <View className="h-2 w-2 bg-red" />
            <Text className="font-mono-bold text-[10px] uppercase text-muted" style={{ letterSpacing: 1 }}>
              Remplaçants
            </Text>
          </View>
          <View className="flex-row gap-4">
            <SubsList name={homeName} subs={homeSubs} />
            <SubsList name={awayName} subs={awaySubs} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
