import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BracketTree, type Pairing } from '@/components/bracket/BracketTree';
import { GroupStandings } from '@/components/bracket/GroupStandings';
import { RoundSelector } from '@/components/bracket/RoundSelector';
import { ScreenBackground } from '@/components/ScreenBackground';
import { WORLD_CUP } from '@/lib/competitions';
import { formatDayLong, formatTime } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';
import { R32 } from '@/lib/wc2026Bracket';

type Slot = { name?: string; badgeUrl?: string; code?: string; apiId?: string };

export default function Bracket() {
  const router = useRouter();
  const standings = useQuery(api.standings.all);
  const matches = useQuery(api.matches.list);
  const [round, setRound] = useState('PG');

  // 16es = grille FIFA officielle, équipes résolues depuis les classements (API) :
  // une poule TERMINÉE (les 4 équipes ont joué 3 matchs) fixe son 1er et son 2e ; sinon on garde le code.
  const pairings = useMemo<Record<string, Pairing[]>>(() => {
    const byLetter: Record<string, Doc<'standings'>[]> = {};
    for (const r of standings ?? []) {
      const letter = (r.group ?? '').replace(/^Group\s*/, '').trim();
      if (letter) (byLetter[letter] ??= []).push(r);
    }
    for (const k in byLetter) byLetter[k].sort((a, b) => a.rank - b.rank);

    const resolveSlot = (code: string): Slot => {
      const m = code.match(/^([12])([A-L])$/);
      if (!m) return { code }; // meilleur 3e → poule indéterminée
      const rows = byLetter[m[2]];
      if (!rows || rows.length < 2 || !rows.every((r) => r.played >= 3)) return { code };
      const team = rows.find((r) => r.rank === Number(m[1]));
      return team ? { name: frTeam(team.teamName), badgeUrl: team.badgeUrl, apiId: team.teamApiId } : { code };
    };

    // Vrais matchs des 16es (TheSportsDB connaît déjà les 2 équipes + la date) indexés par équipe.
    const realByTeam: Record<string, Doc<'matches'>> = {};
    for (const mm of matches ?? []) {
      if (mm.round !== '32') continue;
      if (mm.homeTeamApiId) realByTeam[mm.homeTeamApiId] = mm;
      if (mm.awayTeamApiId) realByTeam[mm.awayTeamApiId] = mm;
    }

    const r32: Pairing[] = R32.map(({ a, b }) => {
      let home = resolveSlot(a);
      let away = resolveSlot(b);
      let id: string | undefined;
      let date: string | undefined;

      // Si une équipe résolue a un vrai match, on récupère l'adversaire exact + la date + le lien.
      const known = home.apiId ?? away.apiId;
      const real = known ? realByTeam[known] : undefined;
      if (real) {
        const rh: Slot = { name: frTeam(real.homeName), badgeUrl: real.homeBadgeUrl, apiId: real.homeTeamApiId };
        const ra: Slot = { name: frTeam(real.awayName), badgeUrl: real.awayBadgeUrl, apiId: real.awayTeamApiId };
        const knownReal = real.homeTeamApiId === known ? rh : ra;
        const otherReal = real.homeTeamApiId === known ? ra : rh;
        if (home.apiId) {
          home = knownReal;
          away = otherReal;
        } else {
          away = knownReal;
          home = otherReal;
        }
        id = real._id;
        date = `${formatDayLong(real.kickoff)} · ${formatTime(real.kickoff)}`;
      }
      return { id, date, home, away };
    });

    // Tours suivants : remplis automatiquement dès que TheSportsDB publie les matchs
    // (round 16 = 8es, 125 = quarts, 150 = demies, 200 = finale). Triés par coup d'envoi.
    const fromRound = (apiRound: string): Pairing[] =>
      (matches ?? [])
        .filter((m) => m.round === apiRound)
        .sort((a, b) => a.kickoff - b.kickoff)
        .map((m) => ({
          id: m._id as string,
          date: `${formatDayLong(m.kickoff)} · ${formatTime(m.kickoff)}`,
          home: m.homeName ? { name: frTeam(m.homeName), badgeUrl: m.homeBadgeUrl } : undefined,
          away: m.awayName ? { name: frTeam(m.awayName), badgeUrl: m.awayBadgeUrl } : undefined,
        }));

    return {
      '16': r32, // 16es (round 32) — grille FIFA + équipes qualifiées
      '8': fromRound('16'), // 8es de finale
      QF: fromRound('125'), // quarts
      DF: fromRound('150'), // demies
      F: fromRound('200'), // finale
    };
  }, [standings, matches]);

  return (
    <ScreenBackground variant="app">
      <View className="flex-1 pt-12">
        <View className="flex-row items-center justify-between px-5 pb-3">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
            className="h-9 w-9 items-center justify-center rounded-2xl bg-surface"
          >
            <Ionicons name="close" size={20} color="#ffffff" />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <Image source={WORLD_CUP.logo} style={{ width: 22, height: 22 }} contentFit="contain" />
            <Text className="font-display-bold text-base text-white">Coupe du Monde 2026</Text>
          </View>
          <View className="h-9 w-9" />
        </View>

        <RoundSelector activeKey={round} onChange={setRound} />

        {round === 'PG' ? (
          <ScrollView
            contentContainerStyle={{ paddingTop: 10, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {standings && standings.length > 0 ? (
              <GroupStandings rows={standings} matches={matches ?? []} />
            ) : (
              <Text className="mt-16 text-center font-ui text-sm text-muted">
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
