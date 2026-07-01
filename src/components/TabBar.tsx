import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string) => void;
  };
};

const TABS: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  home: { icon: 'home', label: 'ACCUEIL' },
  matches: { icon: 'calendar', label: 'MATCHS' },
  pronos: { icon: 'ticket', label: 'PRONOS' },
  leaderboard: { icon: 'trophy', label: 'RANG' },
  profile: { icon: 'person', label: 'PROFIL' },
};

// Barre d'onglets BRUTALISTE : arête dure (grosse bordure haute), labels mono, actif rouge.
export function TabBar({ state, navigation }: TabBarProps) {
  return (
    <View className="flex-row justify-between border-t-2 border-white bg-tab px-[18px] pb-7 pt-3">
      {state.routes.map((route, index) => {
        const cfg = TABS[route.name];
        if (!cfg) return null;
        const focused = state.index === index;
        const color = focused ? '#E5342B' : '#6B76A8';
        return (
          <Pressable
            key={route.key}
            className="items-center gap-1.5"
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <Ionicons name={cfg.icon} size={22} color={color} />
            <Text className="font-mono-bold text-[9px]" style={{ color, letterSpacing: 0.5 }}>
              {cfg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
