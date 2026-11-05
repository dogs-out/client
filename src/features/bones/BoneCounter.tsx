import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';
import { BoneStatus } from '../../services/boneService';

type Props = { bones: BoneStatus | null; onPress?: () => void };

/** "🦴 7" in the Discover header. Red at zero, so running out is never a surprise. */
export function BoneCounter({ bones, onPress }: Readonly<Props>) {
  if (!bones) return null;
  const empty = bones.remaining === 0;
  return (
    <TouchableOpacity
      style={[styles.chip, empty && styles.chipEmpty]}
      onPress={onPress}
      disabled={!onPress}
      hitSlop={8}
      testID="bone-counter"
      accessibilityLabel={`${bones.remaining} bones`}
    >
      <Text style={styles.icon}>🦴</Text>
      <Text style={[styles.count, empty && styles.countEmpty]}>{bones.remaining}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
    backgroundColor: Colors.glass.inputBg, borderWidth: 1, borderColor: Colors.border,
  },
  chipEmpty: { borderColor: Colors.error },
  icon: { fontSize: 14 },
  count: { fontSize: 14, fontWeight: '700', color: Colors.text, fontVariant: ['tabular-nums'] },
  countEmpty: { color: Colors.error },
});
