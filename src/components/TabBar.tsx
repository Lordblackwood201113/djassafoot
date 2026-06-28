import { Feather } from '@expo/vector-icons';
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

const TABS: Record<string, { icon: keyof typeof Feather.glyphMap; label: string }> = {
  home: { icon: 'home', label: 'Accueil' },
  matches: { icon: 'calendar', label: 'Matchs' },
  pronos: { icon: 'target', label: 'Pronos' },
  leaderboard: { icon: 'award', label: 'Classement' },
  profile: { icon: 'user', label: 'Profil' },
};

export function TabBar({ state, navigation }: TabBarProps) {
  return (
    <View
      className="flex-row justify-between border-t border-white/5 px-5 pb-7 pt-3"
      style={{ backgroundColor: '#101840' }}
    >
      {state.routes.map((route, index) => {
        const cfg = TABS[route.name];
        if (!cfg) return null;
        const focused = state.index === index;
        const color = focused ? '#E5342B' : '#9AA4CC';
        return (
          <Pressable
            key={route.key}
            className="w-16 items-center gap-1"
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
          >
            <Feather name={cfg.icon} size={24} color={color} />
            <Text
              className={`text-[11px] ${focused ? 'font-ui-semibold text-white' : 'font-ui-medium text-muted'}`}
            >
              {cfg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
