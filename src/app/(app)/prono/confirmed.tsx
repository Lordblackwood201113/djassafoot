import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ScreenBackground } from '@/components/ScreenBackground';
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
        <View className="h-20 w-20 items-center justify-center rounded-full bg-green">
          <Ionicons name="checkmark" size={44} color="#ffffff" />
        </View>
        <Text className="mt-6 font-display-bold text-2xl text-white">Pari validé ! 🔥</Text>
        <Text className="mt-1.5 text-center font-ui text-sm text-muted">
          Ton combiné est enregistré. Bonne chance !
        </Text>

        <View className="mt-7 w-full rounded-2xl bg-white/[0.06] px-5 py-4">
          <Row label="Mise" value={`🔥 ${stake ?? 0}`} />
          <View className="my-2 h-px bg-white/[0.08]" />
          <Row label="Cote totale" value={`${odds ?? '—'}`} />
          <View className="my-2 h-px bg-white/[0.08]" />
          <Row label="Gain potentiel" value={`🔥 ${payout ?? 0}`} highlight />
        </View>
      </View>

      <View className="gap-2.5 px-6 pb-10">
        <Pressable
          onPress={() => router.replace('/pronos')}
          className="items-center rounded-2xl bg-white py-4"
        >
          <Text className="font-display-bold text-[15px] text-ink">Voir mes pronos</Text>
        </Pressable>
        <Pressable onPress={() => router.replace('/matches')} className="items-center py-2">
          <Text className="font-ui-medium text-sm text-muted">Retour aux matchs</Text>
        </Pressable>
      </View>
    </ScreenBackground>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="font-ui-medium text-[13px] text-muted">{label}</Text>
      <Text className={`font-display-bold text-[16px] ${highlight ? 'text-green' : 'text-white'}`}>{value}</Text>
    </View>
  );
}
