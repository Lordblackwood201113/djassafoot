import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Header de marque « Noir », persistant : wordmark Djassa·Foot + pill jetons + cloche.
export function AppHeader() {
  const router = useRouter();
  const me = useQuery(api.users.current);
  const unread = useQuery(api.notifications.unreadCount) ?? 0;
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-between px-[18px] pb-2"
      style={{ paddingTop: insets.top + 8 }}
    >
      <View className="flex-row items-center">
        <Text className="font-display text-[18px] text-white">Djassa</Text>
        <Text className="font-display text-[18px] text-muted-2">Foot</Text>
      </View>

      <View className="flex-row items-center gap-2.5">
        <View className="flex-row items-center gap-1.5 rounded-full border border-hairline bg-surface px-3 py-1.5">
          <Text style={{ fontSize: 12 }}>🪙</Text>
          <Text className="font-display-bold text-[14px] text-white">
            {me ? me.flames.toLocaleString('fr-FR') : '—'}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/notifications')}
          className="h-[38px] w-[38px] items-center justify-center rounded-[13px] border border-hairline bg-surface"
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={18} color="#F5F5F4" />
          {unread > 0 ? (
            <View
              className="absolute h-3.5 min-w-[14px] items-center justify-center rounded-full bg-paper px-0.5"
              style={{ right: -3, top: -3 }}
            >
              <Text className="font-ui-bold text-[8px] text-ink">{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
