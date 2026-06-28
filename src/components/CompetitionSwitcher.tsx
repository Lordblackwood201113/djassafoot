import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { COMPETITIONS, WORLD_CUP } from '@/lib/competitions';

// Logo de la compétition (CdM) → ouvre une liste déroulante pour switcher de compétition.
export function CompetitionSwitcher() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const select = (slug: string, available: boolean) => {
    setOpen(false);
    if (!available) router.push(`/competition/${slug}`);
    // CdM (available) → on reste sur la page actuelle
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="h-9 w-9 items-center justify-center rounded-2xl bg-surface"
      >
        <Image source={WORLD_CUP.logo} style={{ width: 22, height: 22 }} contentFit="contain" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 bg-black/50" onPress={() => setOpen(false)}>
          <View className="absolute right-5 top-28 w-64 rounded-2xl bg-surface p-2">
            <Text className="px-3 pb-1 pt-2 font-ui-medium text-xs text-muted">Compétitions</Text>
            {COMPETITIONS.map((c) => (
              <Pressable
                key={c.slug}
                onPress={() => select(c.slug, c.available)}
                className="flex-row items-center gap-3 rounded-xl px-3 py-2.5"
              >
                <Image source={c.logo} style={{ width: 26, height: 26 }} contentFit="contain" />
                <Text className="flex-1 font-ui-medium text-[15px] text-white">{c.short}</Text>
                {c.available ? (
                  <Ionicons name="checkmark" size={18} color="#E5342B" />
                ) : (
                  <Ionicons name="lock-closed" size={13} color="#9AA4CC" />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
