import { Image } from 'expo-image';
import { View } from 'react-native';

export function Badge({ url, size = 40 }: { url?: string; size?: number }) {
  const radius = size / 2;
  if (!url) {
    return (
      <View
        style={{ width: size, height: size, borderRadius: radius }}
        className="bg-blue-bottom"
      />
    );
  }
  return (
    <Image
      source={{ uri: url }}
      style={{ width: size, height: size, borderRadius: radius }}
      contentFit="contain"
    />
  );
}
