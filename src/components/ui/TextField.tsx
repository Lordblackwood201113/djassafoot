import type { ComponentProps } from 'react';
import { Text, TextInput, View } from 'react-native';

type Props = ComponentProps<typeof TextInput> & { label?: string };

export function TextField({ label, ...props }: Props) {
  return (
    <View className="w-full">
      {label ? (
        <Text className="mb-1.5 font-ui-medium text-sm text-muted">{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor="#6B77A8"
        className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3.5 font-ui text-base text-white"
        {...props}
      />
    </View>
  );
}
