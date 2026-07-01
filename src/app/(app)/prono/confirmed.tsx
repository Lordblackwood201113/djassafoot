import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { ScreenBackground } from '@/components/ScreenBackground';
import { BrutalBox } from '@/components/brutal/BrutalBox';
import { BrutalButton } from '@/components/brutal/BrutalButton';
import { usePronoDraft } from '@/store/pronoDraftStore';

export default function PronoConfirmed() {
  const router = useRouter();
  const { odds, payout, stake } = useLocalSearchParams<{ odds: string; payout: string; stake: string }>();
  const reset = usePronoDraft((s) => s.reset);

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <ScreenBackground variant="success">
      <View className="flex-1 items-center justify-center px-8">
        <BrutalBox shadow="#E5342B" offset={7} borderWidth={2} className="h-24 w-24 items-center justify-center bg-green">
          <Ionicons name="checkmark" size={52} color="#0A1230" />
        </BrutalBox>

        <Text className="mt-8 text-center font-display text-3xl uppercase text-white" style={{ letterSpacing: 0.5 }}>
          Pari enregistré
        </Text>
        <Text className="mt-2 text-center font-mono text-[12px] uppercase text-muted" style={{ letterSpacing: 0.5 }}>
          Ton combiné est enregistré. Bonne chance !
        </Text>

        <BrutalBox shadow="#3FCB86" offset={6} borderWidth={2} className="mt-8 w-full bg-surface-3 px-5 py-4">
          <Row label="Mise" value={`🪙 ${stake ?? 0}`} />
          <View className="my-3 h-0.5 bg-white/20" />
          <Row label="Cote totale" value={`${odds ?? '—'}`} />
          <View className="my-3 h-0.5 bg-white/20" />
          <Row label="Gain potentiel" value={`🪙 ${payout ?? 0}`} highlight />
        </BrutalBox>
      </View>

      <View className="gap-3 px-6 pb-10">
        <BrutalButton variant="light" label="Voir mes pronos" onPress={() => router.replace('/pronos')} />
        <BrutalButton variant="ghost" label="Retour aux matchs" onPress={() => router.replace('/matches')} />
      </View>
    </ScreenBackground>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-mono-bold text-[12px] uppercase text-muted" style={{ letterSpacing: 0.5 }}>
        {label}
      </Text>
      <Text className={`font-display text-[18px] ${highlight ? 'text-green' : 'text-white'}`}>{value}</Text>
    </View>
  );
}
