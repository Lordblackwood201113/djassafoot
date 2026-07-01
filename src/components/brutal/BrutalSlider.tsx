import { useRef } from 'react';
import { PanResponder, View } from 'react-native';

import { hardShadow } from '@/lib/brutal';

// Slider brutaliste (piste bordée + curseur carré). Valeurs ENTIÈRES uniquement.
export function BrutalSlider({
  value,
  min = 0,
  max,
  onChange,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const ref = useRef<View>(null);
  const geom = useRef({ left: 0, width: 1 });
  const range = Math.max(1, max - min);

  const measure = () =>
    ref.current?.measureInWindow((x, _y, w) => {
      geom.current = { left: x, width: Math.max(1, w) };
    });

  const setFromPageX = (pageX: number) => {
    const { left, width } = geom.current;
    const ratio = Math.max(0, Math.min(1, (pageX - left) / width));
    onChange(Math.round(min + ratio * range)); // entier
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        measure();
        setFromPageX(e.nativeEvent.pageX);
      },
      onPanResponderMove: (e) => setFromPageX(e.nativeEvent.pageX),
    }),
  ).current;

  const pct = Math.max(0, Math.min(100, ((value - min) / range) * 100));

  return (
    <View
      ref={ref}
      onLayout={measure}
      {...pan.panHandlers}
      style={{ height: 40, justifyContent: 'center' }}
    >
      {/* piste */}
      <View style={{ height: 12, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#0A1230' }}>
        <View
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, backgroundColor: '#E5342B' }}
        />
      </View>
      {/* curseur */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${pct}%`,
          marginLeft: -12,
          width: 24,
          height: 24,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          backgroundColor: '#E5342B',
          ...hardShadow('#0A1230', 3),
        }}
      />
    </View>
  );
}
