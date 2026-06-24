import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

type AnimStyle = 'float' | 'breathe' | 'diagonal' | 'spin';

interface ShapeConfig {
  emoji:   string;
  x:       number;   // left % of screen width
  y:       number;   // top % of screen height
  size:    number;
  opacity: number;
  dur:     number;   // ms per cycle (half for float/breathe/diagonal)
  ty:      number;   // max vertical drift px
  tx:      number;   // max horizontal drift px
  rot:     number;   // max rotation deg
  style?:  AnimStyle;
}

// Three depth layers: large+fast (front), medium, small+slow (back)
const SHAPES: ShapeConfig[] = [
  // — Front layer —
  { emoji: '🦴',    x: 5,  y: 8,  size: 38, opacity: 0.62, dur: 3500, ty: 35, tx: 10, rot: 20 },
  { emoji: '🐾',    x: 80, y: 5,  size: 30, opacity: 0.64, dur: 4500, ty: 40, tx: 12, rot: 15 },
  { emoji: '🎾',    x: 18, y: 52, size: 34, opacity: 0.58, dur: 3800, ty: 32, tx: 22, rot: 0,  style: 'spin' },
  { emoji: '🐕',    x: 86, y: 28, size: 42, opacity: 0.55, dur: 5500, ty: 45, tx: 8,  rot: 10 },
  { emoji: '🐶',    x: 38, y: 36, size: 38, opacity: 0.50, dur: 5000, ty: 40, tx: 14, rot: 8  },

  // — Mid layer —
  { emoji: '🦮',    x: 46, y: 10, size: 32, opacity: 0.52, dur: 5200, ty: 34, tx: 16, rot: 8  },
  { emoji: '🐩',    x: 8,  y: 66, size: 30, opacity: 0.50, dur: 4400, ty: 28, tx: 0,  rot: 0,  style: 'breathe' },
  { emoji: '🦴',    x: 62, y: 62, size: 28, opacity: 0.48, dur: 4800, ty: 38, tx: 10, rot: 25, style: 'diagonal' },
  { emoji: '🐾',    x: 33, y: 77, size: 24, opacity: 0.48, dur: 3700, ty: 30, tx: 8,  rot: 12 },
  { emoji: '🎾',    x: 84, y: 72, size: 30, opacity: 0.46, dur: 5500, ty: 0,  tx: 20, rot: 0,  style: 'spin' },

  // — Back layer (smaller, slower) —
  { emoji: '🐕‍🦺', x: 70, y: 18, size: 26, opacity: 0.40, dur: 6800, ty: 26, tx: 12, rot: 6  },
  { emoji: '🌿',    x: 24, y: 20, size: 28, opacity: 0.44, dur: 5800, ty: 0,  tx: 0,  rot: 0,  style: 'breathe' },
  { emoji: '🌳',    x: 90, y: 54, size: 30, opacity: 0.40, dur: 7500, ty: 0,  tx: 0,  rot: 0,  style: 'breathe' },
  { emoji: '🏡',    x: 14, y: 88, size: 28, opacity: 0.42, dur: 6500, ty: 0,  tx: 0,  rot: 0,  style: 'breathe' },
  { emoji: '🦴',    x: 54, y: 87, size: 22, opacity: 0.42, dur: 5200, ty: 24, tx: 8,  rot: 30 },
  { emoji: '🦮',    x: 58, y: 44, size: 20, opacity: 0.38, dur: 7200, ty: 28, tx: 14, rot: 6  },
];

function FloatingShape({ cfg, sw, sh }: { cfg: ShapeConfig; sw: number; sh: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  const style = cfg.style ?? 'float';

  useEffect(() => {
    if (style === 'spin') {
      Animated.loop(
        Animated.timing(anim, { toValue: 1, duration: cfg.dur, easing: Easing.linear, useNativeDriver: true })
      ).start();
    } else {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: cfg.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: cfg.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    }
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let transforms: any[];

  if (style === 'spin') {
    const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    transforms = [{ rotate }];
  } else if (style === 'breathe') {
    const scale = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.86, 1.14, 0.86] });
    transforms = [{ scale }];
  } else if (style === 'diagonal') {
    const tx = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, cfg.tx, 0] });
    const ty = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -cfg.ty * 0.65, 0] });
    const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${cfg.rot}deg`] });
    transforms = [{ translateX: tx }, { translateY: ty }, { rotate }];
  } else {
    const ty = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -cfg.ty] });
    const tx = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, cfg.tx, 0] });
    const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${cfg.rot}deg`] });
    transforms = [{ translateY: ty }, { translateX: tx }, { rotate }];
  }

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: (cfg.x / 100) * sw,
        top:  (cfg.y / 100) * sh,
        fontSize: cfg.size,
        opacity:  cfg.opacity,
        transform: transforms,
      }}
    >
      {cfg.emoji}
    </Animated.Text>
  );
}

export function FloatingBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {SHAPES.map((s, i) => (
        <FloatingShape key={i} cfg={s} sw={width} sh={height} />
      ))}
    </View>
  );
}