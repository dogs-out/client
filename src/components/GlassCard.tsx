import { StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '../constants/colors';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export function GlassCard({ children, style, padding = 28 }: Props) {
  return (
    <View style={[styles.shadow, style]}>
      <View style={styles.clip}>
        <BlurView intensity={15} tint="light" style={StyleSheet.absoluteFill} />
        <View style={[styles.overlay, { padding }]}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    borderRadius: 28,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 28,
    elevation: 12,
  },
  clip: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  overlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});