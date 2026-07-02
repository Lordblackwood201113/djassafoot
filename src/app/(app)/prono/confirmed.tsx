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
        <BrutalBox shadow={false} borderWidth={1} className="h-24 w-24 items-center justify-center rounded-full border-hairline bg-green">
          <Ionicons name="checkmark" size={52} color="#0A0A0B" />
        </BrutalBox>

        <Text className="mt-8 text-center font-display text-3xl text-white">
          Pari enregistré
        </Text>
        <Text className="mt-2 text-center font-ui-medium text-[12px] text-muted">
          Ton combiné est enregistré. Bonne chance !
        </Text>

        <BrutalBox shadow={false} borderWidth={1} className="mt-8 w-full rounded-2xl border-hairline bg-card px-5 py-4">
          <Row label="Mise" value={`🪙 ${stake ?? 0}`} />
          <View className="my-3 h-px bg-line" />
          <Row label="Cote totale" value={`${odds ?? '—'}`} />
          <View className="my-3 h-px bg-line" />
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
      <Text className="font-ui-semibold text-[12px] text-muted">
        {label}
      </Text>
      <Text className={`font-display text-[18px] ${highlight ? 'text-green' : 'text-white'}`}>{value}</Text>
    </View>
  );
}
