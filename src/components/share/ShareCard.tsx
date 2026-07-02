import { forwardRef } from 'react';
import { Text, View } from 'react-native';

import { Flag } from '@/components/brutal/Flag';
import type { Bet } from '@/components/prono/BetCard';
import { frTeam } from '@/lib/teamNames';

const TITLE: Record<string, string> = {
  won: 'Prono gagné 🏆',
  lost: 'Prono perdu',
  pending: 'Prono en cours',
  void: 'Prono annulé',
};

// Carte de partage « prête à poster » (thème Noir, 340px). Rendue hors-écran, capturée en PNG
// puis uploadée sur Convex → sert d'image OG du lien de partage.
export const ShareCard = forwardRef<View, { bet: Bet; username?: string | null }>(
  ({ bet, username }, ref) => {
    const m = bet.match;
    const payout = bet.payout ?? bet.potentialPayout ?? 0;
    const won = bet.status === 'won';
    const lost = bet.status === 'lost';
    const showScore = m && (m.status === 'live' || m.status === 'finished');
    const hasPen = m?.homePenalty != null && m?.awayPenalty != null;

    return (
      <View ref={ref} collapsable={false} style={{ width: 340, backgroundColor: '#0A0A0B', padding: 22 }}>
        {/* En-tête marque */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Text className="font-display text-[16px] text-white">Djassa</Text>
            <Text className="font-display text-[16px] text-muted-2">Foot</Text>
          </View>
          <Text className="font-ui-medium text-[10px] text-muted-2">Coupe du Monde 2026</Text>
        </View>

        {/* Titre résultat */}
        <Text className="mt-5 font-display text-[24px] text-white">{TITLE[bet.status] ?? TITLE.pending}</Text>

        {/* Match */}
        <View className="mt-4 flex-row items-center rounded-2xl border border-hairline bg-card p-3.5">
          <View className="flex-1 items-center gap-2">
            <Flag name={m?.homeName} size={40} />
            <Text numberOfLines={1} className="font-ui-semibold text-[12px] text-white">
              {frTeam(m?.homeName)}
            </Text>
          </View>
          <View className="items-center px-2">
            <Text className="font-display text-[26px] text-white">
              {showScore ? `${m?.homeScore ?? 0} - ${m?.awayScore ?? 0}` : 'VS'}
            </Text>
            {hasPen ? (
              <Text className="mt-0.5 font-ui-semibold text-[9px] text-muted">
                t.a.b. {m?.homePenalty}-{m?.awayPenalty}
              </Text>
            ) : null}
          </View>
          <View className="flex-1 items-center gap-2">
            <Flag name={m?.awayName} size={40} />
            <Text numberOfLines={1} className="font-ui-semibold text-[12px] text-white">
              {frTeam(m?.awayName)}
            </Text>
          </View>
        </View>

        {/* Combiné */}
        <View className="mt-4 gap-2">
          {bet.legs.map((l: { label?: string; result?: string }, i: number) => (
            <View key={i} className="flex-row items-center justify-between">
              <Text numberOfLines={1} className="flex-1 font-ui-medium text-[12px] text-muted">
                {l.label ?? ''}
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

        {/* Gain */}
        <View className="mt-5 flex-row items-center justify-between rounded-2xl border border-hairline bg-card px-4 py-3">
          <Text className="font-ui-semibold text-[12px] text-muted">
            {won ? 'Gain' : lost ? 'Résultat' : 'Gain potentiel'}
          </Text>
          <Text
            className="font-display text-[22px]"
            style={{ color: won ? '#6FA287' : lost ? '#E5484D' : '#F5F5F4' }}
          >
            {won ? `+🪙 ${payout.toLocaleString('fr-FR')}` : lost ? 'Perdu' : `🪙 ${payout.toLocaleString('fr-FR')}`}
          </Text>
        </View>

        {/* Pied */}
        <View className="mt-5 flex-row items-center justify-between">
          <Text numberOfLines={1} className="font-ui-semibold text-[12px] text-white">
            {username ? `@${username}` : ''}
          </Text>
          <Text className="font-ui-medium text-[10px] text-muted-2">djassafoot.pages.dev</Text>
        </View>
      </View>
    );
  },
);
ShareCard.displayName = 'ShareCard';
