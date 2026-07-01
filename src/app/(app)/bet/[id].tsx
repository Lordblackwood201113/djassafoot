import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Id } from '@convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { BetCard, type Bet } from '@/components/prono/BetCard';
import { ScreenBackground } from '@/components/ScreenBackground';
import { hardShadow } from '@/lib/brutal';

// En-tête de résultat selon le statut du pari.
const HERO: Record<
  string,
  { title: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; shadow: string }
> = {
  won: { title: 'Prono gagné', icon: 'trophy', bg: '#3FCB86', fg: '#0A1230', shadow: '#0A1230' },
  lost: { title: 'Prono perdu', icon: 'close', bg: '#E5342B', fg: '#FFFFFF', shadow: '#0A1230' },
  pending: { title: 'En attente', icon: 'hourglass', bg: '#131C3F', fg: '#FFFFFF', shadow: '#E5342B' },
  void: { title: 'Prono annulé', icon: 'remove', bg: '#131C3F', fg: '#9AA4CC', shadow: '#E5342B' },
};

export default function BetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bet = useQuery(api.bets.byId, id ? { id: id as Id<'bets'> } : 'skip') as Bet | null | undefined;

  const status = bet?.status ?? 'pending';
  const hero = HERO[status] ?? HERO.pending;
  const payout = bet?.payout ?? bet?.potentialPayout ?? 0;
  const subtitle =
    status === 'won'
      ? `Tu gagnes +🪙${payout}`
      : status === 'lost'
        ? 'Dommage — retente ta chance !'
        : status === 'void'
          ? 'Pari remboursé'
          : `Gain potentiel : 🪙${payout}`;

  return (
    <ScreenBackground variant={status === 'won' ? 'success' : 'app'}>
      <View className="flex-1" style={{ paddingTop: insets.top + 8 }}>
        <View className="px-4 pt-2">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/pronos'))}
            className="h-11 w-11 items-center justify-center border-2 border-white bg-ink"
            style={[{ borderRadius: 0 }, hardShadow('#E5342B', 4)]}
          >
            <Ionicons name="chevron-back" size={24} color="#ffffff" />
          </Pressable>
        </View>

        {bet === undefined ? (
          <Text className="mt-16 text-center font-mono-bold text-sm uppercase text-muted">Chargement…</Text>
        ) : bet === null ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-center font-display text-base uppercase text-white">Pari introuvable</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* En-tête résultat */}
            <View className="items-center gap-4 pt-2">
              <BrutalBox
                shadow={hero.shadow}
                offset={7}
                borderWidth={2}
                className="h-24 w-24 items-center justify-center"
                style={{ backgroundColor: hero.bg }}
              >
                <Ionicons name={hero.icon} size={48} color={hero.fg} />
              </BrutalBox>
              <View className="items-center gap-1.5">
                <Text className="text-center font-display text-3xl uppercase text-white" style={{ letterSpacing: 0.5 }}>
                  {hero.title}
                </Text>
                <Text
                  className={`text-center font-mono-bold text-[12px] uppercase ${
                    status === 'won' ? 'text-green' : status === 'lost' ? 'text-red' : 'text-muted'
                  }`}
                  style={{ letterSpacing: 0.5 }}
                >
                  {subtitle}
                </Text>
              </View>
            </View>

            {/* Détail du combiné (drapeaux, résultat par pari, mise, gain) */}
            <BetCard bet={bet} />

            <BrutalButton
              variant="ghost"
              label="Voir tous mes pronos"
              onPress={() => router.replace('/pronos')}
            />
          </ScrollView>
        )}
      </View>
    </ScreenBackground>
  );
}
