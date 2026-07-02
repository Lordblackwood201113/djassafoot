import { useAuth } from '@clerk/expo';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutalButton } from '@/components/brutal/BrutalButton';
import { Flag } from '@/components/brutal/Flag';
import { ScreenBackground } from '@/components/ScreenBackground';
import { frTeam } from '@/lib/teamNames';

const TITLE: Record<string, string> = {
  won: 'Prono gagné 🏆',
  lost: 'Prono perdu',
  pending: 'Prono en cours',
  void: 'Prono annulé',
};

// Page PUBLIQUE d'un résultat partagé (hors auth) — le destinataire du lien voit la carte, même
// sans compte, avec un CTA pour s'inscrire. Résout le « Pari introuvable » pour les non-proprios.
export default function SharePublic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn } = useAuth();
  const bet = useQuery(api.bets.publicShare, id ? { id: id as Id<'bets'> } : 'skip');

  const won = bet?.status === 'won';
  const lost = bet?.status === 'lost';
  const showScore = bet && (bet.matchStatus === 'live' || bet.matchStatus === 'finished');
  const hasPen = bet?.homePenalty != null && bet?.awayPenalty != null;

  return (
    <ScreenBackground variant="app">
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center justify-center px-5 py-3">
          <Text className="font-display text-[18px] text-white">Djassa</Text>
          <Text className="font-display text-[18px] text-muted-2">Foot</Text>
        </View>

        {bet === undefined ? (
          <Text className="mt-16 text-center font-ui-semibold text-sm text-muted">Chargement…</Text>
        ) : bet === null ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-center font-display text-base text-white">Partage introuvable</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 18 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Carte résultat */}
            <View className="gap-4 rounded-2xl border border-hairline bg-card p-5">
              <Text className="font-display text-2xl text-white">{TITLE[bet.status] ?? TITLE.pending}</Text>

              <View className="flex-row items-center">
                <View className="flex-1 items-center gap-2">
                  <Flag name={bet.home} size={44} />
                  <Text numberOfLines={1} className="font-ui-semibold text-[13px] text-white">
                    {frTeam(bet.home)}
                  </Text>
                </View>
                <View className="items-center px-2">
                  <Text className="font-display text-[28px] text-white">
                    {showScore ? `${bet.homeScore ?? 0} - ${bet.awayScore ?? 0}` : 'VS'}
                  </Text>
                  {hasPen ? (
                    <Text className="mt-0.5 font-ui-semibold text-[10px] text-muted">
                      t.a.b. {bet.homePenalty}-{bet.awayPenalty}
                    </Text>
                  ) : null}
                </View>
                <View className="flex-1 items-center gap-2">
                  <Flag name={bet.away} size={44} />
                  <Text numberOfLines={1} className="font-ui-semibold text-[13px] text-white">
                    {frTeam(bet.away)}
                  </Text>
                </View>
              </View>

              <View className="gap-2">
                {bet.legs.map((l, i) => (
                  <View key={i} className="flex-row items-center justify-between">
                    <Text numberOfLines={1} className="flex-1 font-ui-medium text-[12px] text-muted">
                      {l.label}
                    </Text>
                    <Text
                      className="ml-3 font-ui-semibold text-[12px]"
                      style={{ color: l.result === 'won' ? '#6FA287' : l.result === 'lost' ? '#E5484D' : '#A1A1AA' }}
                    >
                      {l.result === 'won' ? '✓' : l.result === 'lost' ? '✗' : '•'}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="flex-row items-center justify-between border-t border-line pt-3">
                <Text className="font-ui-semibold text-[12px] text-muted">
                  {won ? 'Gain' : lost ? 'Résultat' : 'Gain potentiel'}
                </Text>
                <Text
                  className="font-display text-[22px]"
                  style={{ color: won ? '#6FA287' : lost ? '#E5484D' : '#F5F5F4' }}
                >
                  {won ? `+🪙 ${bet.payout.toLocaleString('fr-FR')}` : lost ? 'Perdu' : `🪙 ${bet.payout.toLocaleString('fr-FR')}`}
                </Text>
              </View>

              {bet.username ? (
                <Text className="font-ui-medium text-[11px] text-muted-2">Par @{bet.username}</Text>
              ) : null}
            </View>

            {/* CTA */}
            <View className="gap-2.5 pt-2">
              <Text className="text-center font-ui-medium text-[12px] text-muted">
                Pronostique la Coupe du Monde 2026 et défie tes amis. 🪙
              </Text>
              {isSignedIn ? (
                <BrutalButton label="Ouvrir l'app" variant="primary" onPress={() => router.replace('/home')} />
              ) : (
                <>
                  <BrutalButton label="Créer mon compte" variant="primary" onPress={() => router.replace('/sign-up')} />
                  <BrutalButton label="J'ai déjà un compte" variant="ghost" onPress={() => router.replace('/sign-in')} />
                </>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenBackground>
  );
}
