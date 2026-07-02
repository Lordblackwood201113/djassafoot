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
  home: { icon: 'home', label: 'Accueil' },
  matches: { icon: 'calendar', label: 'Matchs' },
  pronos: { icon: 'ticket', label: 'Pronos' },
  leaderboard: { icon: 'trophy', label: 'Rang' },
  profile: { icon: 'person', label: 'Profil' },
};

// Barre d'onglets « Noir » : filet hairline en haut, actif = blanc, inactif = muted.
export function TabBar({ state, navigation }: TabBarProps) {
  return (
    <View className="flex-row justify-between border-t border-hairline bg-tab px-[18px] pb-7 pt-3">
      {state.routes.map((route, index) => {
        const cfg = TABS[route.name];
        if (!cfg) return null;
        const focused = state.index === index;
        const color = focused ? '#F5F5F4' : '#6B7280';
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
            <Text className={`text-[10px] ${focused ? 'font-ui-bold' : 'font-ui-medium'}`} style={{ color }}>
              {cfg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
