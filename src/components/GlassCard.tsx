import { StyleSheet, View, ViewStyle } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  /** Corner radius for both the shadow and the clipped glass — defaults to the standard card radius. */
  radius?: number;
  /** Optional rgba() overlay color, e.g. for tinting a bubble/card away from neutral glass. */
  tint?: string;
  /** Shrinks the shadow proportionally for small elements (e.g. chat bubbles) — a full-size card shadow reads as a glowing blob on something this small. */
  compact?: boolean;
}

export function GlassCard({ children, style, padding = 28, radius = 28, tint, compact = false }: Props) {
  const shadow = compact ? styles.shadowCompact : styles.shadow;
  return (
    <View style={[shadow, { borderRadius: radius }, style]}>
      <View style={[styles.clip, { borderRadius: radius }]}>
        <GlassView glassEffectStyle="clear" style={StyleSheet.absoluteFill} />
        {tint && <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />}
        <LinearGradient
          colors={['rgba(255,255,255,0.78)', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        />
        <View style={{ padding }}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: Colors.text,
    shadowOffset: { width: 6, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  shadowCompact: {
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 3,
  },
  clip: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderTopColor:    'rgba(255, 255, 255, 0.95)',
    borderLeftColor:   'rgba(255, 255, 255, 0.75)',
    borderRightColor:  'rgba(255, 255, 255, 0.40)',
    borderBottomColor: 'rgba(255, 255, 255, 0.25)',
  },
});