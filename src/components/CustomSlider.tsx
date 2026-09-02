import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

const isIOS = Platform.OS === 'ios';

// Thumb geometry. At rest it's a solid brand pill; held, it swells into a
// translucent lozenge you can read the track through — the same Liquid Glass
// treatment as GlassButton/GlassCard, matching what iOS 26 does to a native
// slider. The grown size is also a bigger visual target under the fingertip,
// which is where it matters.
const REST   = { w: 34, h: 22, r: 11 };
const ACTIVE = { w: 54, h: 44, r: 21 };
const TRACK_H = 64;

/**
 * The slider handle, shared by the plain slider and the two-handle range slider.
 *
 * Width, height, radius and offsets all animate together, so the pill grows from
 * its own centre instead of jumping sideways as the geometry changes.
 */
export function GlassThumb({ pressed, style }: Readonly<{
  pressed: boolean;
  /** Placement only — the thumb owns its own size, radius and centring. */
  style?: StyleProp<ViewStyle>;
}>) {
  const grow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(grow, {
      toValue: pressed ? 1 : 0,
      // Layout properties can't run on the native driver.
      useNativeDriver: false,
      friction: 7,
      tension: 140,
    }).start();
  }, [pressed, grow]);

  const between = (from: number, to: number) =>
    grow.interpolate({ inputRange: [0, 1], outputRange: [from, to] });

  const width  = between(REST.w, ACTIVE.w);
  const height = between(REST.h, ACTIVE.h);
  const radius = between(REST.r, ACTIVE.r);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.thumb,
        style,
        {
          width, height, borderRadius: radius,
          marginLeft: between(-REST.w / 2, -ACTIVE.w / 2),
          marginTop:  between(-REST.h / 2, -ACTIVE.h / 2),
        },
      ]}
    >
      {/* Resting state: a solid brand pill, fading out as the glass takes over. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: Colors.primary, borderRadius: radius, opacity: between(1, 0) },
        ]}
      />

      {/* Held state: live glass on iOS, a flat frost everywhere else. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.glassClip, { borderRadius: radius, opacity: grow }]}
      >
        {isIOS
          ? <GlassView glassEffectStyle="clear" style={StyleSheet.absoluteFill} />
          : <View style={[StyleSheet.absoluteFill, styles.frost]} />
        }
        <LinearGradient
          colors={['rgba(255,255,255,0.80)', 'rgba(255,255,255,0.24)', 'rgba(255,255,255,0)']}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Marker for @ptomasroos/react-native-multi-slider's `customMarker`, which hands
 * us the pressed state and positions the marker itself — so unlike the slider
 * below, this one centres with transforms rather than absolute offsets.
 */
export function GlassRangeMarker({ pressed }: Readonly<{ pressed: boolean }>) {
  return (
    <View style={styles.markerBox}>
      <GlassThumb pressed={pressed} style={styles.markerThumb} />
    </View>
  );
}

// ─── Pure-JS slider ────────────────────────────────────────────────────────────
export function CustomSlider({ value, min, max, step, onChange, onDragStart, onDragEnd }: Readonly<{
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}>) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [pressed, setPressed] = useState(false);
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
    onPanResponderGrant: e => { setPressed(true); onDragStart?.(); compute(e.nativeEvent.locationX); },
    onPanResponderMove: e => compute(e.nativeEvent.locationX),
    onPanResponderRelease: () => { setPressed(false); onDragEnd?.(); },
    onPanResponderTerminate: () => { setPressed(false); onDragEnd?.(); },
  })).current;

  const fillPct = trackWidth > 0 ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <View
      style={sliderStyles.track}
      // Reach past the visual bounds — `compute` clamps the ratio to 0..1, so a
      // touch landing in the slop still resolves to a valid value.
      hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
      onLayout={e => { const w = e.nativeEvent.layout.width; setTrackWidth(w); stateRef.current.trackWidth = w; }}
      {...pan.panHandlers}
    >
      <View style={sliderStyles.rail} />
      <View style={[sliderStyles.fill, { width: `${fillPct}%` }]} />
      <GlassThumb pressed={pressed} style={{ left: `${fillPct}%`, top: TRACK_H / 2 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    position: 'absolute',
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    // No elevation on Android: on a translucent view its shadow pass composites
    // the subtree against an opaque white buffer, leaving a white slab.
    elevation: 0,
  },
  glassClip: {
    overflow: 'hidden',
    borderWidth: 1,
    borderTopColor:    'rgba(255, 255, 255, 0.95)',
    borderLeftColor:   'rgba(255, 255, 255, 0.75)',
    borderRightColor:  'rgba(255, 255, 255, 0.40)',
    borderBottomColor: 'rgba(255, 255, 255, 0.25)',
  },
  frost: { backgroundColor: 'rgba(255, 255, 255, 0.65)' },
  // The library centres the marker on the track for us, so the box only has to
  // hold the largest state the thumb can reach.
  markerBox:   { width: ACTIVE.w, height: ACTIVE.h, alignItems: 'center', justifyContent: 'center' },
  markerThumb: { left: '50%', top: '50%' },
});

export const sliderStyles = StyleSheet.create({
  // Tall track + generous thumb: the rail itself is only 4pt, so the touch target
  // has to come from the container or the drag is easy to miss.
  track: { height: TRACK_H, justifyContent: 'center', position: 'relative' },
  rail:  { height: 4, backgroundColor: Colors.border, borderRadius: 2, position: 'absolute', left: 0, right: 0 },
  fill:  { height: 4, backgroundColor: Colors.primary, borderRadius: 2, position: 'absolute', left: 0 },
});
