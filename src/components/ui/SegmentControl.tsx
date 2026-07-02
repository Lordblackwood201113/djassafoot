import { Pressable, Text, View } from 'react-native';

type Segment = { key: string; label: string };

export function SegmentControl({
  segments,
  value,
  onChange,
}: {
  segments: Segment[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-row gap-2 px-5">
      {segments.map((s) => {
        const active = s.key === value;
        return (
          <Pressable
            key={s.key}
            onPress={() => onChange(s.key)}
            className={`flex-1 items-center rounded-full py-2.5 ${
              active ? 'bg-paper' : 'border border-hairline bg-surface'
            }`}
          >
            <Text
              className={`text-sm ${active ? 'font-ui-semibold text-ink' : 'font-ui-medium text-muted'}`}
            >
              {s.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
