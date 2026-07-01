import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useAction, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlameBalance } from '@/components/FlameBalance';
import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { BrutalSegment } from '@/components/brutal/Segment';
import { Flag } from '@/components/brutal/Flag';
import { LineupView } from '@/components/match/LineupView';
import { PitchView } from '@/components/match/PitchView';
import { StatsView } from '@/components/match/StatsView';
import { TimelineView } from '@/components/match/TimelineView';
import { ScreenBackground } from '@/components/ScreenBackground';
import { EVENTS, track } from '@/lib/analytics';
import { LOGO } from '@/lib/assets';
import { hardShadow } from '@/lib/brutal';
import { COMP_NAME, formatHeroDate } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';

const TWO_HOURS = 2 * 60 * 60 * 1000;

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const match = useQuery(api.matches.byId, id ? { id: id as Id<'matches'> } : 'skip');
  const myBets = useQuery(api.bets.forMatch, id ? { matchId: id as Id<'matches'> } : 'skip');
  const details = useQuery(api.matchDetails.getDetails, id ? { matchId: id as Id<'matches'> } : 'skip');
  const syncDetails = useAction(api.matchDetails.syncDetails);
  const [now] = useState(() => Date.now());

  const tracked = useRef(false);
  useEffect(() => {
    if (match && !tracked.current) {
      track(EVENTS.matchViewed, { matchId: match._id, status: match.status, round: match.round });
      tracked.current = true;
    }
  }, [match]);

  // Récupère compo/temps forts/stats à l'ouverture (si match proche/en cours/terminé),
  // puis rafraîchit toutes les 60s tant que le match est en direct.
  useEffect(() => {
    if (!match || !id) return;
    const near = match.status !== 'scheduled' || match.kickoff - Date.now() < TWO_HOURS;
    if (!near) return;
    const run = () => syncDetails({ matchId: id as Id<'matches'> }).catch(() => {});
    run();
    if (match.status === 'live') {
      const t = setInterval(run, 60000);
      return () => clearInterval(t);
    }
  }, [match?._id, match?.status, match?.kickoff, id, syncDetails]);

  const canPredict = match?.status === 'scheduled' && match.kickoff > now;

  // Onglets disponibles selon les données réellement présentes.
  const tabs = useMemo(() => {
    const t: { key: string; label: string }[] = [];
    if (details?.lineup?.length) t.push({ key: 'lineup', label: 'COMPO' });
    if (details?.timeline?.length) t.push({ key: 'timeline', label: 'TEMPS FORTS' });
    if (details?.stats?.length) t.push({ key: 'stats', label: 'STATS' });
    return t;
  }, [details]);

  const [tab, setTab] = useState<string | null>(null);
  const activeTab = tab && tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;

  return (
    <ScreenBackground variant="app">
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between px-4 pt-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
            className="h-11 w-11 items-center justify-center border-2 border-white bg-ink"
            style={[{ borderRadius: 0 }, hardShadow('#E5342B', 4)]}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </Pressable>
          <Image
            source={LOGO}
            style={{ width: 120, height: 23 }}
            resizeMode="contain"
            accessibilityLabel="Djassa Foot"
          />
          <FlameBalance />
        </View>

        {match ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Compétition */}
            <View className="flex-row items-center gap-2">
              <View className="h-[10px] w-[10px] bg-red" style={{ borderRadius: 0 }} />
              <Text className="font-mono-bold text-xs uppercase tracking-widest text-muted">
                {COMP_NAME[match.competitionApiId] ?? 'Coupe du Monde'}
              </Text>
            </View>

            {/* Bloc central : drapeaux + score/VS */}
            <BrutalBox shadow="#E5342B" offset={6} borderWidth={2} className="bg-surface-3 px-4 py-6">
              <View className="flex-row items-center justify-between">
                <View className="items-center gap-2" style={{ width: 96 }}>
                  <View
                    className="items-center justify-center border-2 border-white bg-ink"
                    style={{ width: 76, height: 76, borderRadius: 0 }}
                  >
                    <Flag name={match.homeName} size={52} />
                  </View>
                </View>

                {match.status === 'scheduled' ? (
                  <View
                    className="items-center justify-center border-2 border-white bg-red"
                    style={[{ width: 56, height: 56, borderRadius: 0 }, hardShadow('#0A1230', 4)]}
                  >
                    <Text className="font-display text-2xl uppercase text-white">VS</Text>
                  </View>
                ) : (
                  <View className="items-center">
                    <View
                      className="items-center justify-center border-2 border-white bg-ink px-3 py-1"
                      style={[{ borderRadius: 0 }, hardShadow('#E5342B', 4)]}
                    >
                      <Text className="font-display text-4xl text-white">
                        {match.homeScore ?? 0} - {match.awayScore ?? 0}
                      </Text>
                    </View>
                    {match.homePenalty != null && match.awayPenalty != null ? (
                      <Text className="mt-1.5 font-mono-bold text-[10px] uppercase text-red">
                        T.a.b. {match.homePenalty} - {match.awayPenalty}
                      </Text>
                    ) : null}
                    {match.status === 'live' ? (
                      <View className="mt-2 flex-row items-center gap-1.5 bg-red px-2 py-0.5" style={{ borderRadius: 0 }}>
                        <View className="h-1.5 w-1.5 bg-white" style={{ borderRadius: 0 }} />
                        <Text className="font-mono-bold text-[10px] uppercase tracking-widest text-white">Live</Text>
                      </View>
                    ) : null}
                  </View>
                )}

                <View className="items-center gap-2" style={{ width: 96 }}>
                  <View
                    className="items-center justify-center border-2 border-white bg-ink"
                    style={{ width: 76, height: 76, borderRadius: 0 }}
                  >
                    <Flag name={match.awayName} size={52} />
                  </View>
                </View>
              </View>

              <View className="mt-5 h-[3px] w-full bg-red" style={{ borderRadius: 0 }} />
              <Text className="mt-4 text-center font-display text-2xl uppercase text-white">
                {frTeam(match.homeName)} — {frTeam(match.awayName)}
              </Text>
            </BrutalBox>

            {/* Statut / date */}
            <View className="flex-row items-center gap-2">
              <View className="h-[10px] w-[10px] bg-red" style={{ borderRadius: 0 }} />
              <Text className="font-mono-bold text-sm uppercase tracking-wide text-muted">
                {match.status === 'live'
                  ? `${match.minute ? `${match.minute}' · ` : ''}En cours`
                  : match.status === 'finished'
                    ? 'Terminé'
                    : formatHeroDate(match.kickoff)}
              </Text>
            </View>

            {/* Action prono */}
            {canPredict ? (
              <View className="w-full gap-3">
                <BrutalButton
                  label={myBets && myBets.length > 0 ? 'Ajouter un prono' : 'Pronostiquer'}
                  variant="primary"
                  onPress={() => router.push(`/prono/${match._id}`)}
                />
                {myBets && myBets.length > 0 ? (
                  <BrutalBox shadow={false} borderWidth={2} className="bg-surface-3 px-4 py-3">
                    <Text className="font-mono-bold text-xs uppercase tracking-wide text-green">
                      {`${myBets.length} pari${myBets.length > 1 ? 's' : ''} déjà placé${myBets.length > 1 ? 's' : ''} sur ce match`}
                    </Text>
                  </BrutalBox>
                ) : null}
              </View>
            ) : (
              <BrutalBox shadow={false} borderWidth={2} className="bg-surface-3 px-4 py-3">
                <Text className="font-mono-bold text-xs uppercase tracking-wide text-muted">
                  Pronos fermés pour ce match
                </Text>
              </BrutalBox>
            )}

            {/* Détails : compo / temps forts / stats */}
            {tabs.length > 0 ? (
              <View className="gap-3">
                <BrutalSegment options={tabs} value={activeTab ?? ''} onChange={setTab} />
                <BrutalBox shadow={false} borderWidth={2} className="bg-surface-3 p-4">
                  {activeTab === 'lineup' ? (
                    details!.homeFormation && details!.lineup.some((p) => p.grid) ? (
                      <PitchView
                        lineup={details!.lineup}
                        homeName={match.homeName}
                        awayName={match.awayName}
                        homeFormation={details!.homeFormation}
                        awayFormation={details!.awayFormation}
                      />
                    ) : (
                      <LineupView lineup={details!.lineup} homeName={match.homeName} awayName={match.awayName} />
                    )
                  ) : null}
                  {activeTab === 'timeline' ? (
                    <TimelineView
                      timeline={details!.timeline}
                      homeName={match.homeName}
                      awayName={match.awayName}
                    />
                  ) : null}
                  {activeTab === 'stats' ? <StatsView stats={details!.stats} /> : null}
                </BrutalBox>
                {match.status === 'finished' && details?.videoUrl ? (
                  <BrutalButton
                    label="Voir les temps forts (vidéo)"
                    variant="light"
                    onPress={() => Linking.openURL(details.videoUrl!)}
                  />
                ) : null}
              </View>
            ) : match.status === 'scheduled' ? (
              <BrutalBox shadow={false} borderWidth={2} className="bg-surface-3 px-4 py-3">
                <Text className="font-mono text-[11px] uppercase text-muted" style={{ lineHeight: 17 }}>
                  Compo disponible environ 1h avant le coup d'envoi.
                </Text>
              </BrutalBox>
            ) : null}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="font-mono-bold text-sm uppercase tracking-widest text-muted">Chargement…</Text>
          </View>
        )}
      </View>
    </ScreenBackground>
  );
}
