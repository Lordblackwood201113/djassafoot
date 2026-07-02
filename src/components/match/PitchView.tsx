import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Flag } from '@/components/brutal/Flag';
import type { LineupPlayer } from '@/components/match/LineupView';
import { frTeam } from '@/lib/teamNames';

const PITCH_HEIGHT = 470;

function surname(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1] || name;
}

// Place les titulaires d'une équipe à partir du `grid` API-Football ("ligne:colonne").
// Vue d'une seule équipe : elle occupe tout le terrain (gardien en bas ~92%, attaque en haut ~8%).
function placed(players: LineupPlayer[]) {
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
      const y = 92 - t * 84; // occupe presque toute la hauteur du terrain
      out.push({ p, x, y });
    });
  }
  return out;
}

// Couleur de la pastille de note : vert (bon), blanc (moyen), rouge (faible).
function ratingBadge(r: number): { bg: string; fg: string } {
  if (r >= 7) return { bg: '#6FA287', fg: '#0A0A0B' };
  if (r >= 6) return { bg: '#FFFFFF', fg: '#0A0A0B' };
  return { bg: '#E5484D', fg: '#FFFFFF' };
}

function Jersey({
  p,
  x,
  y,
  accent,
  fg,
  isMotm,
}: {
  p: LineupPlayer;
  x: number;
  y: number;
  accent: string;
  fg: string;
  isMotm: boolean;
}) {
  const rb = p.rating != null ? ratingBadge(p.rating) : null;
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
      <View style={{ width: 26, height: 26 }}>
        <View
          className="h-full w-full items-center justify-center"
          style={{ borderRadius: 13, backgroundColor: accent }}
        >
          <Text className="font-display text-[11px]" style={{ color: fg }}>
            {p.number ?? ''}
          </Text>
        </View>
        {rb ? (
          <View
            style={{
              position: 'absolute',
              top: -7,
              right: -9,
              backgroundColor: rb.bg,
              borderRadius: 5,
              paddingHorizontal: 2.5,
              paddingVertical: 0.5,
            }}
          >
            <Text style={{ color: rb.fg, fontSize: 8, fontWeight: '800' }}>{p.rating!.toFixed(1)}</Text>
          </View>
        ) : null}
        {isMotm ? (
          <View
            style={{
              position: 'absolute',
              top: -8,
              left: -8,
              width: 14,
              height: 14,
              borderRadius: 7,
              backgroundColor: '#6FA287',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="star" size={8} color="#0A0A0B" />
          </View>
        ) : null}
      </View>
      <View
        style={{ marginTop: 3, maxWidth: 66, backgroundColor: '#1C1C20E6', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1.5 }}
      >
        <Text
          numberOfLines={1}
          className="font-ui-semibold text-[8px] text-white"
        >
          {surname(p.name)}
        </Text>
      </View>
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
  const [side, setSide] = useState<'home' | 'away'>('home');
  const isHome = side === 'home';
  const teamName = isHome ? homeName : awayName;
  const otherName = isHome ? awayName : homeName;
  const formation = isHome ? homeFormation : awayFormation;
  // Marqueurs joueurs = cercles blancs, numéro encre (distinction d'équipe via le sélecteur).
  const accent = '#F5F5F4';
  const fg = '#0A0A0B';

  const xi = placed(lineup.filter((p) => (isHome ? p.isHome : !p.isHome) && !p.isSub && p.grid));
  const subs = lineup.filter((p) => (isHome ? p.isHome : !p.isHome) && p.isSub);

  // Homme du match = meilleure note du match (toutes équipes confondues).
  const rated = lineup.filter((p) => typeof p.rating === 'number');
  const motm = rated.length
    ? rated.reduce((a, b) => ((b.rating ?? 0) > (a.rating ?? 0) ? b : a))
    : null;
  const samePlayer = (a: LineupPlayer, b: LineupPlayer) =>
    a.apiId != null && b.apiId != null
      ? a.apiId === b.apiId
      : a.name === b.name && a.isHome === b.isHome;

  return (
    <View className="gap-3">
      {/* Sélecteur d'équipe (bascule) + formation */}
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={() => setSide(isHome ? 'away' : 'home')}
          accessibilityLabel={`Voir la compo de ${frTeam(otherName)}`}
          className="flex-row items-center gap-2 rounded-full border border-hairline bg-surface-2 px-2.5 py-1.5"
        >
          <Flag name={teamName} size={20} />
          <Text numberOfLines={1} className="font-display text-[13px] text-white">
            {frTeam(teamName)}
          </Text>
          <Ionicons name="swap-horizontal" size={16} color="#A1A1AA" />
        </Pressable>
        {formation ? (
          <View className="rounded-full border border-hairline px-2.5 py-1">
            <Text className="font-ui-semibold text-[11px] text-white">
              {formation}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Homme du match (note max) */}
      {motm && motm.rating != null ? (
        <View className="flex-row items-center gap-2 rounded-2xl border border-hairline bg-card px-2.5 py-2">
          <Ionicons name="star" size={13} color="#6FA287" />
          <Text className="font-ui-semibold text-[9px] text-muted">
            Homme du match
          </Text>
          <Text numberOfLines={1} className="flex-1 font-ui-semibold text-[11px] text-white">
            {motm.name}
          </Text>
          <Text className="font-display text-[14px] text-green">{motm.rating.toFixed(1)}</Text>
        </View>
      ) : null}

      {/* Terrain */}
      <View
        className="w-full overflow-hidden rounded-2xl border border-hairline"
        style={{ height: PITCH_HEIGHT, backgroundColor: '#0E4128' }}
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
              backgroundColor: i % 2 ? '#10492D' : '#0E4128',
            }}
          />
        ))}

        {/* Lignes du terrain */}
        <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.18)' }} />
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 76,
            height: 76,
            marginLeft: -38,
            marginTop: -38,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
            borderRadius: 38,
          }}
        />
        <View style={{ position: 'absolute', top: '50%', left: '50%', width: 6, height: 6, marginLeft: -3, marginTop: -3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        {/* Surfaces de réparation + 6 mètres */}
        <View style={{ position: 'absolute', top: 0, left: '50%', width: 100, height: 44, marginLeft: -50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }} />
        <View style={{ position: 'absolute', top: 0, left: '50%', width: 50, height: 18, marginLeft: -25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ position: 'absolute', bottom: 0, left: '50%', width: 100, height: 44, marginLeft: -50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' }} />
        <View style={{ position: 'absolute', bottom: 0, left: '50%', width: 50, height: 18, marginLeft: -25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }} />

        {xi.map(({ p, x, y }, i) => (
          <Jersey key={i} p={p} x={x} y={y} accent={accent} fg={fg} isMotm={!!motm && samePlayer(p, motm)} />
        ))}
      </View>

      {/* Remplaçants de l'équipe affichée */}
      {subs.length ? (
        <View className="mt-1 border-t border-line pt-3">
          <View className="mb-2 flex-row items-center gap-1.5">
            <Text className="font-ui-semibold text-[10px] text-muted">
              Remplaçants · {frTeam(teamName)}
            </Text>
          </View>
          <View className="flex-row flex-wrap gap-y-1">
            {subs.map((p, i) => (
              <Text
                key={i}
                numberOfLines={1}
                className="font-ui-medium text-[10px] text-white/80"
                style={{ width: '50%' }}
              >
                {p.number != null ? `${p.number}  ` : ''}
                {p.name}
                {p.rating != null ? `  ·  ${p.rating.toFixed(1)}` : ''}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
