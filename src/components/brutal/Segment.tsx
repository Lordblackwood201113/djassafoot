import { Pressable, Text, View } from 'react-native';

// Thème « Noir » : contrôle segmenté en pilule — conteneur arrondi + fond carte, segment actif
// = pastille blanche (texte noir), inactifs = texte muted. Casse normale, sans bordure dure.
export function BrutalSegment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <View
      className="flex-row items-center gap-1 border border-hairline bg-surface p-1"
      style={{ borderRadius: 999 }}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            className="flex-1 items-center justify-center py-2"
            style={{ borderRadius: 999, backgroundColor: active ? '#F5F5F4' : 'transparent' }}
          >
            <Text
              className={`text-[13px] ${active ? 'font-ui-bold' : 'font-ui-medium'}`}
              style={{ color: active ? '#0A0A0B' : '#A1A1AA' }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
