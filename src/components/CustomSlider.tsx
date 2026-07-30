import { useEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/colors';

// ─── Pure-JS slider ────────────────────────────────────────────────────────────
export function CustomSlider({ value, min, max, step, onChange, onDragStart, onDragEnd }: {
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const stateRef = useRef({ trackWidth: 0, min, max, step });
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { stateRef.current = { trackWidth, min, max, step }; }, [trackWidth, min, max, step]);

  const compute = (x: number) => {
    const { trackWidth: w, min: lo, max: hi, step: s } = stateRef.current;
    if (w === 0) return;
    const ratio = Math.max(0, Math.min(1, x / w));
    onChangeRef.current(Math.round((lo + ratio * (hi - lo)) / s) * s);
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => { onDragStart?.(); compute(e.nativeEvent.locationX); },
    onPanResponderMove: e => compute(e.nativeEvent.locationX),
    onPanResponderRelease: () => onDragEnd?.(),
    onPanResponderTerminate: () => onDragEnd?.(),
  })).current;

  const fillPct = trackWidth > 0 ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <View
      style={sliderStyles.track}
      onLayout={e => { const w = e.nativeEvent.layout.width; setTrackWidth(w); stateRef.current.trackWidth = w; }}
      {...pan.panHandlers}
    >
      <View style={sliderStyles.rail} />
      <View style={[sliderStyles.fill, { width: `${fillPct}%` }]} />
      <View style={[sliderStyles.thumb, { left: `${fillPct}%`, transform: [{ translateX: -14 }] }]} />
    </View>
  );
}

export const sliderStyles = StyleSheet.create({
  // Tall track + generous thumb: the rail itself is only 4pt, so the touch target
  // has to come from the container or the drag is easy to miss.
  track: { height: 56, justifyContent: 'center', position: 'relative' },
  rail:  { height: 4, backgroundColor: Colors.border, borderRadius: 2, position: 'absolute', left: 0, right: 0 },
  fill:  { height: 4, backgroundColor: Colors.primary, borderRadius: 2, position: 'absolute', left: 0 },
  thumb: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, position: 'absolute', top: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  multiThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
});
