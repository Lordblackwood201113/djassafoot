import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BracketTree, type Pairing, type TeamSlot } from '@/components/bracket/BracketTree';
import { GroupStandings } from '@/components/bracket/GroupStandings';
import { BrutalSegment } from '@/components/brutal/Segment';
import { ScreenBackground } from '@/components/ScreenBackground';
import { hardShadow } from '@/lib/brutal';
import { WORLD_CUP } from '@/lib/competitions';
import { formatDayLong, formatTime } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';
import { R32 } from '@/lib/wc2026Bracket';

// Sélecteur de tours brutaliste : cellules carrées bordées, actif = rouge.
const ROUND_OPTIONS = [
  { key: 'PG', label: 'PG' },
  { key: '16', label: '16E' },
  { key: '8', label: '8E' },
  { key: 'QF', label: 'QF' },
  { key: 'DF', label: 'DF' },
  { key: 'F', label: 'F' },
];

export default function Bracket() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const standings = useQuery(api.standings.all);
  const matches = useQuery(api.matches.list);
  const [round, setRound] = useState('PG');

  // Arbre complet résolu depuis l'API : les 16es depuis la grille FIFA + classements, puis chaque
  // tour suivant par PROPAGATION des vainqueurs (slot i alimenté par les slots 2i / 2i+1). Dès qu'une
  // équipe gagne son match, elle apparaît au tour suivant en attendant son adversaire.
  const pairings = useMemo<Record<string, Pairing[]>>(() => {
    const byLetter: Record<string, Doc<'standings'>[]> = {};
    for (const r of standings ?? []) {
      const letter = (r.group ?? '').replace(/^Group\s*/, '').trim();
      if (letter) (byLetter[letter] ??= []).push(r);
    }
    for (const k in byLetter) byLetter[k].sort((a, b) => a.rank - b.rank);

    // Résout un code de slot (« 1E » = 1er groupe E) vers une équipe si sa poule est TERMINÉE.
    const resolveSlot = (code: string): TeamSlot => {
      const m = code.match(/^([12])([A-L])$/);
      if (!m) return { code }; // meilleur 3e → poule indéterminée
      const rows = byLetter[m[2]];
      if (!rows || rows.length < 2 || !rows.every((r) => r.played >= 3)) return { code };
      const team = rows.find((r) => r.rank === Number(m[1]));
      return team
        ? { name: frTeam(team.teamName), rawName: team.teamName, badgeUrl: team.badgeUrl, apiId: team.teamApiId }
        : { code };
    };

    const teamSlot = (name?: string, apiId?: string | null, badge?: string | null): TeamSlot | undefined =>
      name
        ? { name: frTeam(name), rawName: name, apiId: apiId || undefined, badgeUrl: badge || undefined }
        : undefined;

    const pairingFromMatch = (m: Doc<'matches'>): Pairing => ({
      id: m._id as string,
      date: `${formatDayLong(m.kickoff)} · ${formatTime(m.kickoff)}`,
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      homePenalty: m.homePenalty,
      awayPenalty: m.awayPenalty,
      winner: m.winner,
      home: teamSlot(m.homeName, m.homeTeamApiId, m.homeBadgeUrl),
      away: teamSlot(m.awayName, m.awayTeamApiId, m.awayBadgeUrl),
    });

    // Vainqueur d'un match terminé : le champ `winner` (API-Football) prime, puis le score,
    // puis les tirs au but. Permet de propager/griser même sur un nul réglementaire.
    const winnerOf = (p?: Pairing): TeamSlot | undefined => {
      if (!p || p.status !== 'finished') return undefined;
      if (p.winner === 'home') return p.home;
      if (p.winner === 'away') return p.away;
      if (p.homeScore == null || p.awayScore == null) return undefined;
      if (p.homeScore > p.awayScore) return p.home;
      if (p.awayScore > p.homeScore) return p.away;
      if (p.homePenalty != null && p.awayPenalty != null) {
        if (p.homePenalty > p.awayPenalty) return p.home;
        if (p.awayPenalty > p.homePenalty) return p.away;
      }
      return undefined;
    };

    // 16es (round 32) : équipes résolues depuis les classements, liées aux vrais matchs par apiId.
    const realByTeam32: Record<string, Doc<'matches'>> = {};
    for (const mm of matches ?? []) {
      if (mm.round !== '32') continue;
      if (mm.homeTeamApiId) realByTeam32[mm.homeTeamApiId] = mm;
      if (mm.awayTeamApiId) realByTeam32[mm.awayTeamApiId] = mm;
    }

    const r32: Pairing[] = R32.map(({ a, b }) => {
      const home = resolveSlot(a);
      const away = resolveSlot(b);
      const known = home.apiId ?? away.apiId;
      const real = known ? realByTeam32[known] : undefined;
      // Vrai match lié → on garde SON orientation domicile/extérieur pour que les scores
      // restent alignés sur les bonnes équipes (sinon winnerOf propagerait le perdant).
      // Sinon on affiche les codes de qualification résolus depuis les classements.
      return real ? pairingFromMatch(real) : { home, away };
    });

    // Tour suivant : slot i = vainqueur(2i) vs vainqueur(2i+1). Si le vrai match existe déjà
    // (TheSportsDB), on l'utilise (scores/date/clic) ; sinon on affiche les vainqueurs connus.
    const buildRound = (prev: Pairing[], apiRound: string): Pairing[] => {
      const reals = (matches ?? []).filter((m) => m.round === apiRound);
      const out: Pairing[] = [];
      for (let i = 0; i < Math.floor(prev.length / 2); i++) {
        const f0 = prev[2 * i];
        const f1 = prev[2 * i + 1];
        const candIds = new Set(
          [f0?.home?.apiId, f0?.away?.apiId, f1?.home?.apiId, f1?.away?.apiId].filter(Boolean) as string[],
        );
        const real = reals.find(
          (m) =>
            (m.homeTeamApiId && candIds.has(m.homeTeamApiId)) ||
            (m.awayTeamApiId && candIds.has(m.awayTeamApiId)),
        );
        out.push(real ? pairingFromMatch(real) : { home: winnerOf(f0), away: winnerOf(f1) });
      }
      return out;
    };

    const r16 = buildRound(r32, '16'); // 8es
    const qf = buildRound(r16, '125'); // quarts
    const df = buildRound(qf, '150'); // demies
    const f = buildRound(df, '200'); // finale

    return { '16': r32, '8': r16, QF: qf, DF: df, F: f };
  }, [standings, matches]);

  return (
    <ScreenBackground variant="app">
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between px-5 pb-4">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
            className="h-10 w-10 items-center justify-center border-2 border-white bg-ink"
            style={{ borderRadius: 0, ...hardShadow('#E5342B', 4) }}
          >
            <Ionicons name="close" size={20} color="#ffffff" />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <Image source={WORLD_CUP.logo} style={{ width: 22, height: 22 }} contentFit="contain" />
            <Text className="font-display text-[15px] uppercase text-white" style={{ letterSpacing: 0.5 }}>
              Coupe du Monde 2026
            </Text>
          </View>
          <View className="h-10 w-10" />
        </View>

        <View className="mx-4 mb-2">
          <BrutalSegment options={ROUND_OPTIONS} value={round} onChange={setRound} />
        </View>

        {round === 'PG' ? (
          <ScrollView
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {standings && standings.length > 0 ? (
              <GroupStandings rows={standings} matches={matches ?? []} />
            ) : (
              <Text className="mt-16 text-center font-mono text-xs uppercase text-muted">
                Chargement des classements…
              </Text>
            )}
          </ScrollView>
        ) : (
          <View className="flex-1 pt-2">
            <BracketTree
              focusRound={round}
              pairingsByRound={pairings}
              onOpen={(id) => router.push(`/match/${id}`)}
            />
          </View>
        )}
      </View>
    </ScreenBackground>
  );
}
