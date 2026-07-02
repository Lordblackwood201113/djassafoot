import type { ComponentProps } from 'react';
import { Text, TextInput, View } from 'react-native';

type Props = ComponentProps<typeof TextInput> & { label?: string };

// Champ « Noir » : carte sombre, fine bordure hairline, coins arrondis, label discret.
export function TextField({ label, ...props }: Props) {
  return (
    <View className="w-full gap-1.5">
      {label ? <Text className="font-ui-semibold text-[12px] text-muted">{label}</Text> : null}
      <TextInput
        placeholderTextColor="#6B7280"
        className="w-full border border-hairline bg-surface px-4 py-3.5 font-ui text-[14px] text-white"
        style={{ borderRadius: 12 }}
        {...props}
      />
    </View>
  );
}
