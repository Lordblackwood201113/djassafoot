import { Pressable, Text, View } from 'react-native';

// Segment brutaliste : cellules à arêtes vives, séparateurs épais, actif = rouge.
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
    <View className="flex-row border-2 border-white" style={{ borderRadius: 0 }}>
      {options.map((o, i) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            className={`flex-1 items-center justify-center py-2.5 ${active ? 'bg-red' : 'bg-ink'}`}
            style={i < options.length - 1 ? { borderRightWidth: 2, borderColor: '#FFFFFF' } : undefined}
          >
            <Text className={`font-mono-bold text-[11px] ${active ? 'text-white' : 'text-muted'}`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
