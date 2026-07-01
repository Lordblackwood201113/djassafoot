import type { ComponentProps } from 'react';
import { Text, TextInput, View } from 'react-native';

type Props = ComponentProps<typeof TextInput> & { label?: string };

// Champ de saisie brutaliste : bordure blanche épaisse, angles vifs, label mono.
export function TextField({ label, ...props }: Props) {
  return (
    <View className="w-full">
      {label ? (
        <Text
          className="mb-1.5 font-mono-bold text-[11px] uppercase text-muted"
          style={{ letterSpacing: 1 }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor="#6B77A8"
        className="w-full border-2 border-white bg-surface-3 px-4 py-3.5 font-mono text-[14px] text-white"
        style={{ borderRadius: 0 }}
        {...props}
      />
    </View>
  );
}
