import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import { useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Header de marque BRUTALISTE, persistant : wordmark DJASSA·FOOT + chip jetons + cloche.
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
        <Text className="font-display text-[18px] text-white">DJASSA</Text>
        <Text className="font-display text-[18px] text-red">FOOT</Text>
      </View>

      <View className="flex-row items-center gap-2.5">
        <View
          className="flex-row items-center gap-1.5 border-2 border-white bg-surface-3 px-2.5 py-1.5"
          style={{ borderRadius: 0 }}
        >
          <Text style={{ fontSize: 12 }}>🪙</Text>
          <Text className="font-display text-[14px] text-white">
            {me ? me.flames.toLocaleString('fr-FR') : '—'}
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/notifications')}
          className="h-[38px] w-[38px] items-center justify-center border-2 border-white bg-surface-3"
          style={{ borderRadius: 0 }}
          accessibilityLabel="Notifications"
        >
          <Ionicons name="notifications-outline" size={18} color="#ffffff" />
          {unread > 0 ? (
            <View
              className="absolute h-3.5 min-w-[14px] items-center justify-center border-2 border-ink bg-red px-0.5"
              style={{ borderRadius: 0, right: -4, top: -4 }}
            >
              <Text className="font-mono-bold text-[8px] text-white">
                {unread > 9 ? '9+' : unread}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>
    </View>
  );
}
