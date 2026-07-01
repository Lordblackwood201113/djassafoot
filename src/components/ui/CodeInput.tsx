import { useRef } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  length?: number;
  onComplete?: (v: string) => void;
};

// Saisie de code OTP : N cases visuelles + un TextInput invisible par-dessus qui capte la frappe.
export function CodeInput({ value, onChangeText, length = 6, onComplete }: Props) {
  const inputRef = useRef<TextInput>(null);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, length);
    onChangeText(digits);
    if (digits.length === length) onComplete?.(digits);
  };

  return (
    <Pressable className="w-full flex-row gap-2.5" onPress={() => inputRef.current?.focus()}>
      {Array.from({ length }).map((_, i) => {
        const char = value[i] ?? '';
        const active = i === value.length;
        return (
          <View
            key={i}
            className={`h-[58px] flex-1 items-center justify-center ${
              char ? 'bg-surface-3' : 'bg-ink'
            }`}
            style={{ borderRadius: 0, borderWidth: 2, borderColor: active ? '#E5342B' : '#FFFFFF' }}
          >
            <Text className="font-display text-2xl text-white">{char}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        style={{ position: 'absolute', opacity: 0, width: '100%', height: 58 }}
      />
    </Pressable>
  );
}
