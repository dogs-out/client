import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

interface Props {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
  /** Optional rgba() overlay color, e.g. to read as a primary CTA rather than neutral glass. */
  tint?: string;
}

export function GlassButton({ onPress, children, style, disabled, tint }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      style={[styles.shadow, disabled && styles.disabled, style]}
    >
      <View style={styles.clip}>
        <GlassView isInteractive glassEffectStyle="clear" style={StyleSheet.absoluteFill} />
        {tint && <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />}
        <LinearGradient
          colors={['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
          locations={[0, 0.45, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        />
        <View style={styles.content}>
          {children}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 12,
    shadowColor: Colors.text,
    shadowOffset: { width: 4, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  clip: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderTopColor:    'rgba(255, 255, 255, 0.95)',
    borderLeftColor:   'rgba(255, 255, 255, 0.75)',
    borderRightColor:  'rgba(255, 255, 255, 0.40)',
    borderBottomColor: 'rgba(255, 255, 255, 0.25)',
  },
  content: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabled: { opacity: 0.5 },
});