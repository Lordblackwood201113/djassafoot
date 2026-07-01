import { Ionicons } from '@expo/vector-icons';
import { api } from '@convex/_generated/api';
import type { Doc, Id } from '@convex/_generated/dataModel';
import { useMutation, useQuery } from 'convex/react';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ScreenBackground } from '@/components/ScreenBackground';
import { BrutalBox } from '@/components/brutal/BrutalBox';
import { EVENTS, track } from '@/lib/analytics';
import { hardShadow } from '@/lib/brutal';

function ago(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

function visual(n: Doc<'notifications'>) {
  if (n.title.includes('gagné')) return { color: '#3FCB86', icon: 'trophy' as const };
  if (n.title.includes('perdu')) return { color: '#E5342B', icon: 'close-circle' as const };
  if (n.kind === 'daily_bonus' || n.title.includes('🪙')) return { color: '#F5A623', icon: 'flame' as const };
  return { color: '#9AA4CC', icon: 'notifications' as const };
}

function NotifRow({ n, isNew }: { n: Doc<'notifications'>; isNew: boolean }) {
  const router = useRouter();
  const v = visual(n);
  // Un prono résolu ouvre l'écran de résultat du pari ; sinon on retombe sur le match.
  const target = n.betId ? `/bet/${n.betId}` : n.matchId ? `/match/${n.matchId}` : null;
  const Wrapper = target ? Pressable : View;
  return (
    <Wrapper onPress={target ? () => router.push(target as never) : undefined}>
      <BrutalBox
        shadow={isNew ? '#E5342B' : false}
        offset={4}
        borderWidth={2}
        className="flex-row items-stretch gap-3 bg-surface-3 p-3"
      >
        <View
          className="h-11 w-11 items-center justify-center border-2 border-white"
          style={{ borderRadius: 0, backgroundColor: v.color }}
        >
          <Ionicons name={v.icon} size={22} color="#0A1230" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-start gap-2">
            <Text className="flex-1 font-mono-bold text-[13px] uppercase text-white">{n.title}</Text>
            {isNew ? (
              <View className="h-2.5 w-2.5 bg-red" style={{ borderRadius: 0 }} />
            ) : null}
          </View>
          <Text className="mt-1 font-mono text-[12px] leading-[17px] uppercase text-muted">{n.body}</Text>
          <Text className="mt-1.5 font-mono text-[10px] uppercase text-muted" style={{ letterSpacing: 0.5 }}>
            {ago(n.createdAt)}
          </Text>
        </View>
      </BrutalBox>
    </Wrapper>
  );
}

export default function Notifications() {
  const router = useRouter();
  const notifs = useQuery(api.notifications.list);
  const markAllRead = useMutation(api.notifications.markAllRead);
  const newIds = useRef<Set<string>>(new Set());
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (notifs && !armed) {
      const unreadCount = notifs.filter((n) => !n.read).length;
      newIds.current = new Set(notifs.filter((n) => !n.read).map((n) => n._id as string));
      setArmed(true);
      track(EVENTS.notificationViewed, { total: notifs.length, unread: unreadCount });
      if (newIds.current.size > 0) markAllRead();
    }
  }, [notifs, armed, markAllRead]);

  return (
    <ScreenBackground variant="app">
      <View className="flex-1 pt-12">
        <View className="flex-row items-center gap-3 px-5 pb-3">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            className="h-10 w-10 items-center justify-center border-2 border-white bg-surface-3"
            style={{ borderRadius: 0, ...hardShadow('#E5342B', 3) }}
          >
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </Pressable>
          <View className="h-2.5 w-2.5 bg-red" style={{ borderRadius: 0 }} />
          <Text className="flex-1 font-display text-[18px] uppercase text-white" style={{ letterSpacing: 0.5 }}>
            Notifications
          </Text>
        </View>

        {notifs === undefined ? (
          <View className="flex-1 items-center justify-center px-10">
            <BrutalBox shadow="#E5342B" offset={4} borderWidth={2} className="bg-surface-3 px-5 py-3">
              <Text className="font-mono-bold text-[12px] uppercase text-muted" style={{ letterSpacing: 1 }}>
                Chargement…
              </Text>
            </BrutalBox>
          </View>
        ) : notifs.length === 0 ? (
          <View className="flex-1 items-center justify-center px-10">
            <View
              className="h-16 w-16 items-center justify-center border-2 border-white bg-surface-3"
              style={{ borderRadius: 0, ...hardShadow('#E5342B', 5) }}
            >
              <Ionicons name="notifications-outline" size={30} color="#9AA4CC" />
            </View>
            <Text className="mt-5 text-center font-display text-[16px] uppercase text-white">Aucune notification</Text>
            <Text className="mt-2 text-center font-mono text-[12px] uppercase leading-[17px] text-muted">
              Tes pronos résolus et tes bonus apparaîtront ici.
            </Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 14 }}
            showsVerticalScrollIndicator={false}
          >
            {notifs.map((n) => (
              <NotifRow key={n._id} n={n} isNew={newIds.current.has(n._id as Id<'notifications'>)} />
            ))}
          </ScrollView>
        )}
      </View>
    </ScreenBackground>
  );
}
