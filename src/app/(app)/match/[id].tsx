import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useAction, useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { COMP_NAME, formatHeroDate, phaseHeading } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';
import { usePronoDraft } from '@/store/pronoDraftStore';

const TWO_HOURS = 2 * 60 * 60 * 1000;

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const match = useQuery(api.matches.byId, id ? { id: id as Id<'matches'> } : 'skip');
  const myBets = useQuery(api.bets.forMatch, id ? { matchId: id as Id<'matches'> } : 'skip');
  const details = useQuery(api.matchDetails.getDetails, id ? { matchId: id as Id<'matches'> } : 'skip');
  const syncDetails = useAction(api.matchDetails.syncDetails);
  const resetDraft = usePronoDraft((s) => s.reset);
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
  // 1 seul pronostic par match : on grise l'entrée du prono si un pari NON-void existe déjà (miroir du
  // garde serveur bets.place). `myBets === undefined` (chargement) ⇒ hasBet=false → pas de grisage prématuré.
  const hasBet = !!myBets && myBets.some((b) => b.status !== 'void');

  // Onglets disponibles selon les données réellement présentes.
  const tabs = useMemo(() => {
    const t: { key: string; label: string }[] = [];
    if (details?.lineup?.length) t.push({ key: 'lineup', label: 'Compo' });
    if (details?.timeline?.length) t.push({ key: 'timeline', label: 'Temps forts' });
    if (details?.stats?.length) t.push({ key: 'stats', label: 'Stats' });
    return t;
  }, [details]);

  const [tab, setTab] = useState<string | null>(null);
  const activeTab = tab && tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;

  return (
    <ScreenBackground variant="app">
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-between px-4 pb-1 pt-1">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/matches'))}
            className="h-11 w-11 items-center justify-center rounded-[13px] border border-hairline bg-surface-2"
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </Pressable>
          <Text className="font-display text-lg text-white">
            {match ? phaseHeading(match.round) : 'Match'}
          </Text>
          <Pressable
            onPress={() => router.push('/bracket')}
            className="h-11 w-11 items-center justify-center rounded-[13px] border border-hairline bg-surface-2"
            accessibilityLabel="Voir le tableau final"
          >
            <MaterialCommunityIcons name="tournament" size={20} color="#ffffff" />
          </Pressable>
        </View>

        {match ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40, gap: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero compact : drapeaux + noms + score/statut */}
            <BrutalBox shadow={false} borderWidth={1} className="rounded-2xl bg-card px-4 py-4">
              <View className="mb-3 flex-row items-center justify-center gap-2">
                <Text className="font-ui-semibold text-[10px] text-muted" style={{ letterSpacing: 0.5 }}>
                  {COMP_NAME[match.competitionApiId] ?? 'Coupe du Monde'} · {phaseHeading(match.round)}
                </Text>
              </View>

              <View className="flex-row items-center">
                <View className="flex-1 flex-row items-center gap-2">
                  <Flag name={match.homeName} size={30} />
                  <Text numberOfLines={2} className="flex-1 font-display text-[13px] text-white">
                    {frTeam(match.homeName)}
                  </Text>
                </View>

                <View className="items-center gap-1.5 px-2">
                  {match.status === 'scheduled' ? (
                    <>
                      <Text className="font-display text-2xl text-muted">VS</Text>
                      <Text className="font-ui-semibold text-[9px] text-muted">
                        {formatHeroDate(match.kickoff)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text className="font-display text-[26px] text-white">
                        {match.homeScore ?? 0} - {match.awayScore ?? 0}
                      </Text>
                      {match.status === 'live' ? (
                        <View className="flex-row items-center gap-1.5 rounded-full bg-red px-2 py-0.5">
                          <View className="h-1.5 w-1.5 rounded-full bg-white" />
                          <Text className="font-ui-semibold text-[9px] text-white">
                            {match.minute ? `${match.minute}'` : 'Live'}
                          </Text>
                        </View>
                      ) : (
                        <Text className="font-ui-semibold text-[9px] text-muted">
                          Terminé
                        </Text>
                      )}
                      {match.homePenalty != null && match.awayPenalty != null ? (
                        <Text className="font-ui-semibold text-[9px] text-muted">
                          T.a.b. {match.homePenalty}-{match.awayPenalty}
                        </Text>
                      ) : null}
                    </>
                  )}
                </View>

                <View className="flex-1 flex-row items-center justify-end gap-2">
                  <Text numberOfLines={2} className="flex-1 text-right font-display text-[13px] text-white">
                    {frTeam(match.awayName)}
                  </Text>
                  <Flag name={match.awayName} size={30} />
                </View>
              </View>
            </BrutalBox>

            {/* Action prono — un seul pronostic par match (règle CGU) */}
            {canPredict ? (
              <View className="w-full gap-3">
                <BrutalButton
                  label={hasBet ? 'Pari déjà placé' : 'Pronostiquer'}
                  variant="primary"
                  disabled={hasBet}
                  onPress={
                    hasBet
                      ? undefined
                      : () => {
                          resetDraft(); // nouveau pari : repart d'un brouillon vierge (jamais en mode édition)
                          router.push(`/prono/${match._id}`);
                        }
                  }
                />
                {hasBet ? (
                  <BrutalBox shadow={false} borderWidth={1} className="rounded-2xl bg-card px-4 py-3">
                    <Text className="font-ui-semibold text-xs text-green">
                      Tu as déjà pronostiqué ce match
                    </Text>
                  </BrutalBox>
                ) : null}
              </View>
            ) : (
              <BrutalBox shadow={false} borderWidth={1} className="rounded-2xl bg-card px-4 py-3">
                <Text className="font-ui-semibold text-xs text-muted">
                  Pronos fermés pour ce match
                </Text>
              </BrutalBox>
            )}

            {/* Détails : compo / temps forts / stats */}
            {tabs.length > 0 ? (
              <View className="gap-3">
                <BrutalSegment options={tabs} value={activeTab ?? ''} onChange={setTab} />
                <BrutalBox shadow={false} borderWidth={1} className="rounded-2xl bg-card p-4">
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
              <BrutalBox shadow={false} borderWidth={1} className="rounded-2xl bg-card px-4 py-3">
                <Text className="font-ui-medium text-[11px] text-muted" style={{ lineHeight: 17 }}>
                  Compo disponible environ 1h avant le coup d'envoi.
                </Text>
              </BrutalBox>
            ) : null}
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="font-ui-semibold text-sm text-muted">Chargement…</Text>
          </View>
        )}
      </View>
    </ScreenBackground>
  );
}
