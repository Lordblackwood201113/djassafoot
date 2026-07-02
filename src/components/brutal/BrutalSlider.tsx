import { useRef } from 'react';
import { PanResponder, View } from 'react-native';

// Slider « Noir » : piste fine arrondie + remplissage blanc + curseur rond. Valeurs ENTIÈRES.
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
    onChange(Math.round(min + ratio * range));
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
      <View style={{ height: 6, borderRadius: 999, backgroundColor: '#1C1C20' }}>
        <View
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 999, backgroundColor: '#F5F5F4' }}
        />
      </View>
      {/* curseur */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: `${pct}%`,
          marginLeft: -11,
          width: 22,
          height: 22,
          borderRadius: 999,
          borderWidth: 2,
          borderColor: '#0A0A0B',
          backgroundColor: '#F5F5F4',
        }}
      />
    </View>
  );
}
