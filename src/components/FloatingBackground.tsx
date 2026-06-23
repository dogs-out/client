import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';

interface ShapeConfig {
  emoji: string;
  x: number;      // left as % of screen width
  y: number;      // top as % of screen height
  size: number;
  opacity: number;
  dur: number;    // ms per half-cycle
  ty: number;     // max vertical drift px
  tx: number;     // max horizontal drift px
  rot: number;    // max rotation deg (use 360 for balls)
}

const SHAPES: ShapeConfig[] = [
  { emoji: '🦴', x: 5,  y: 8,  size: 36, opacity: 0.20, dur: 3500, ty: 35, tx: 10, rot: 20  },
  { emoji: '🐾', x: 80, y: 5,  size: 28, opacity: 0.22, dur: 4500, ty: 40, tx: 12, rot: 15  },
  { emoji: '🎾', x: 18, y: 50, size: 32, opacity: 0.20, dur: 4000, ty: 30, tx: 18, rot: 360 },
  { emoji: '🐕', x: 88, y: 30, size: 40, opacity: 0.16, dur: 5500, ty: 45, tx: 8,  rot: 10  },
  { emoji: '🌭', x: 48, y: 10, size: 28, opacity: 0.18, dur: 5000, ty: 35, tx: 15, rot: 15  },
  { emoji: '🪃', x: 8,  y: 68, size: 34, opacity: 0.20, dur: 4200, ty: 28, tx: 22, rot: 45  },
  { emoji: '🦴', x: 63, y: 60, size: 26, opacity: 0.18, dur: 4800, ty: 38, tx: 10, rot: 25  },
  { emoji: '🐾', x: 35, y: 76, size: 24, opacity: 0.18, dur: 3700, ty: 32, tx: 8,  rot: 12  },
  { emoji: '🎾', x: 85, y: 74, size: 30, opacity: 0.15, dur: 6000, ty: 30, tx: 6,  rot: 360 },
  { emoji: '🐶', x: 40, y: 36, size: 38, opacity: 0.13, dur: 5200, ty: 40, tx: 12, rot: 8   },
  { emoji: '🌭', x: 70, y: 18, size: 26, opacity: 0.17, dur: 4000, ty: 35, tx: 18, rot: 18  },
  { emoji: '🪃', x: 25, y: 18, size: 30, opacity: 0.15, dur: 4500, ty: 28, tx: 20, rot: 60  },
  { emoji: '🦴', x: 55, y: 86, size: 22, opacity: 0.18, dur: 4400, ty: 30, tx: 12, rot: 30  },
  { emoji: '🐾', x: 92, y: 55, size: 26, opacity: 0.16, dur: 4600, ty: 40, tx: 8,  rot: 20  },
];

function FloatingShape({ config, screenW, screenH }: { config: ShapeConfig; screenW: number; screenH: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: config.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: config.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -config.ty] });
  const translateX = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, config.tx, 0] });
  const rotate = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${config.rot}deg`] });

  return (
    <Animated.Text
      style={{
        position: 'absolute',
        left: (config.x / 100) * screenW,
        top: (config.y / 100) * screenH,
        fontSize: config.size,
        opacity: config.opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    >
      {config.emoji}
    </Animated.Text>
  );
}

export function FloatingBackground() {
  const { width, height } = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {SHAPES.map((shape, i) => (
        <FloatingShape key={i} config={shape} screenW={width} screenH={height} />
      ))}
    </View>
  );
}