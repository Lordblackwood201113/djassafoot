import { Ionicons } from '@expo/vector-icons';
import type { Doc } from '@convex/_generated/dataModel';
import { Text, View } from 'react-native';

import { BrutalBox } from '@/components/brutal/BrutalBox';
import { Flag } from '@/components/brutal/Flag';
import { formatDay, formatTime } from '@/lib/format';
import { frTeam } from '@/lib/teamNames';

export type Bet = Doc<'bets'> & {
  match: {
    homeName: string;
    awayName: string;
    kickoff: number;
    status: string;
    homeScore?: number;
    awayScore?: number;
    homePenalty?: number;
    awayPenalty?: number;
  } | null;
};

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  pending: { label: 'En attente', cls: 'text-muted', dot: '#A1A1AA' },
  won: { label: 'Gagné', cls: 'text-green', dot: '#6FA287' },
  lost: { label: 'Perdu', cls: 'text-red', dot: '#E5484D' },
  void: { label: 'Annulé', cls: 'text-muted', dot: '#A1A1AA' },
};

// Icône de résultat d'un pari simple (leg), une fois le pari réglé.
function legIcon(result?: string): { name: keyof typeof Ionicons.glyphMap; color: string } | null {
  if (result === 'won') return { name: 'checkmark', color: '#6FA287' };
  if (result === 'lost') return { name: 'close', color: '#E5484D' };
  if (result === 'void') return { name: 'remove', color: '#A1A1AA' };
  return null;
}

export function BetCard({ bet }: { bet: Bet }) {
  const m = bet.match;
  const st = STATUS[bet.status] ?? STATUS.pending;
  const settled = bet.status !== 'pending';
  const showScore = m && (m.status === 'live' || m.status === 'finished');
  const won = bet.status === 'won';
  const hasPen = m?.homePenalty != null && m?.awayPenalty != null;
  return (
    <BrutalBox shadow={false} borderWidth={1} className="rounded-2xl border-hairline bg-card px-4 py-3.5">
      <View className="flex-row items-center">
        <View className="flex-1 flex-row items-center gap-2">
          <Flag name={m?.homeName} size={26} />
          <Text numberOfLines={1} className="flex-shrink font-ui-semibold text-[13px] text-white">
            {frTeam(m?.homeName)}
          </Text>
        </View>
        <View className="mx-2 rounded-full bg-surface-2 px-2.5 py-1">
          <Text className="font-display text-[15px] text-white">
            {showScore ? `${m?.homeScore ?? 0} - ${m?.awayScore ?? 0}` : m ? formatTime(m.kickoff) : ''}
          </Text>
        </View>
        <View className="flex-1 flex-row items-center justify-end gap-2">
          <Text
            numberOfLines={1}
            className="flex-shrink text-right font-ui-semibold text-[13px] text-white"
          >
            {frTeam(m?.awayName)}
          </Text>
          <Flag name={m?.awayName} size={26} />
        </View>
      </View>

      {hasPen ? (
        <Text className="mt-1 text-center font-ui-semibold text-[10px] text-muted">
          T.a.b. {m?.homePenalty} - {m?.awayPenalty}
        </Text>
      ) : null}

      <View className="mt-2.5 flex-row items-center justify-between">
        <Text className="font-ui-medium text-[11px] text-muted">{m ? formatDay(m.kickoff) : ''}</Text>
        <View className="rounded-full border border-hairline px-2 py-0.5">
          <Text className={`font-ui-semibold text-[10px] ${st.cls}`}>{st.label}</Text>
        </View>
      </View>

      <View className="mt-2.5 gap-1.5 border-t border-line pt-2.5">
        {bet.legs.map((l, i) => {
          const ic = settled ? legIcon(l.result) : null;
          return (
            <View key={i} className="flex-row items-center justify-between gap-2">
              <View className="flex-1 flex-row items-center gap-1.5">
                {ic ? <Ionicons name={ic.name} size={13} color={ic.color} /> : null}
                <Text numberOfLines={1} className="flex-shrink font-ui-medium text-[11px] text-muted">
                  {l.label}
                </Text>
              </View>
              <Text className="font-ui-semibold text-[12px] text-white">{l.odds.toFixed(2)}</Text>
            </View>
          );
        })}
      </View>

      <View className="mt-2.5 flex-row items-center justify-between border-t border-line pt-2.5">
        <Text className="font-ui-medium text-[11px] text-muted">
          Mise 🪙{bet.stake} · Cote {bet.totalOdds.toFixed(2)}
        </Text>
        <Text className={`font-display text-[14px] ${won ? 'text-green' : 'text-white'}`}>
          {won
            ? `+🪙${bet.payout ?? bet.potentialPayout}`
            : bet.status === 'lost'
              ? '—'
              : `🪙${bet.potentialPayout}`}
        </Text>
      </View>
    </BrutalBox>
  );
}
