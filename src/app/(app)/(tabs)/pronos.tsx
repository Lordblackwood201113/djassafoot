import { api } from '@convex/_generated/api';
import type { Doc } from '@convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { Badge } from '@/components/match/Badge';
import { ScreenBackground } from '@/components/ScreenBackground';
import { formatDay, formatTime } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';

type Bet = Doc<'bets'> & {
  match: {
    homeName: string;
    awayName: string;
    homeBadgeUrl?: string;
    awayBadgeUrl?: string;
    kickoff: number;
    status: string;
    homeScore?: number;
    awayScore?: number;
  } | null;
};

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  pending: { label: 'En attente', cls: 'text-muted', dot: '#9AA4CC' },
  won: { label: 'Gagné', cls: 'text-green', dot: '#3FCB86' },
  lost: { label: 'Perdu', cls: 'text-red', dot: '#E5342B' },
  void: { label: 'Annulé', cls: 'text-muted', dot: '#9AA4CC' },
};

function BetCard({ bet }: { bet: Bet }) {
  const m = bet.match;
  const st = STATUS[bet.status] ?? STATUS.pending;
  const showScore = m && (m.status === 'live' || m.status === 'finished');
  return (
    <View className="rounded-2xl bg-surface px-4 py-3.5">
      <View className="flex-row items-center">
        <View className="flex-1 flex-row items-center gap-2">
          <Badge url={m?.homeBadgeUrl} size={24} />
          <Text numberOfLines={1} className="flex-shrink font-ui-semibold text-[14px] text-white">
            {frTeam(m?.homeName)}
          </Text>
        </View>
        <Text className="px-2 font-display-bold text-[15px] text-white">
          {showScore ? `${m?.homeScore ?? 0} - ${m?.awayScore ?? 0}` : m ? formatTime(m.kickoff) : ''}
        </Text>
        <View className="flex-1 flex-row items-center justify-end gap-2">
          <Text numberOfLines={1} className="flex-shrink text-right font-ui-semibold text-[14px] text-white">
            {frTeam(m?.awayName)}
          </Text>
          <Badge url={m?.awayBadgeUrl} size={24} />
        </View>
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <Text className="font-ui text-[11px] text-muted">{m ? formatDay(m.kickoff) : ''}</Text>
        <View className="flex-row items-center gap-1.5">
          <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: st.dot }} />
          <Text className={`font-ui-medium text-[12px] ${st.cls}`}>{st.label}</Text>
        </View>
      </View>

      <View className="mt-2.5 gap-1 border-t border-white/[0.06] pt-2.5">
        {bet.legs.map((l, i) => (
          <View key={i} className="flex-row items-center justify-between">
            <Text numberOfLines={1} className="flex-shrink font-ui text-[12px] text-muted">
              {l.label}
            </Text>
            <Text className="font-ui-medium text-[12px] text-white">{l.odds.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View className="mt-2.5 flex-row items-center justify-between border-t border-white/[0.06] pt-2.5">
        <Text className="font-ui text-[12px] text-muted">
          Mise 🔥{bet.stake} · Cote {bet.totalOdds.toFixed(2)}
        </Text>
        <Text className={`font-display-bold text-[13px] ${bet.status === 'won' ? 'text-green' : 'text-white'}`}>
          {bet.status === 'won'
            ? `+🔥${bet.payout ?? bet.potentialPayout}`
            : bet.status === 'lost'
              ? '—'
              : `🔥${bet.potentialPayout}`}
        </Text>
      </View>
    </View>
  );
}

export default function Pronos() {
  const bets = useQuery(api.bets.mine) as Bet[] | undefined;
  const [tab, setTab] = useState<'live' | 'done'>('live');

  const filtered = (bets ?? []).filter((b) =>
    tab === 'live' ? b.status === 'pending' : b.status !== 'pending',
  );

  return (
    <ScreenBackground variant="app">
      <View className="flex-1">
        <AppHeader />
        <Text className="px-5 pb-2 pt-1 font-display-bold text-xl text-white">Mes pronos</Text>

        <View className="mx-5 mb-3 flex-row gap-1 rounded-2xl bg-surface p-1.5">
          {(['live', 'done'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 items-center rounded-xl py-2 ${tab === t ? 'bg-red' : ''}`}
            >
              <Text className={`text-[13px] ${tab === t ? 'font-ui-bold text-white' : 'font-ui-medium text-muted'}`}>
                {t === 'live' ? 'En cours' : 'Terminés'}
              </Text>
            </Pressable>
          ))}
        </View>

        {bets === undefined ? (
          <Text className="mt-16 text-center font-ui text-sm text-muted">Chargement…</Text>
        ) : filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="text-4xl">🔥</Text>
            <Text className="mt-3 text-center font-display-bold text-base text-white">
              {tab === 'live' ? 'Aucun prono en cours' : 'Aucun prono terminé'}
            </Text>
            <Text className="mt-1 text-center font-ui text-sm text-muted">
              Va sur un match et tente ta chance !
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {filtered.map((b) => (
              <BetCard key={b._id} bet={b} />
            ))}
          </ScrollView>
        )}
      </View>
    </ScreenBackground>
  );
}
