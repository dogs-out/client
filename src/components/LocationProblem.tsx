import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';
import type { DeviceLocationResult } from '../utils/deviceLocation';

/**
 * Why the phone's location could not be used, right under the button that asked —
 * not at the far end of a long form where nobody sees it — and the way out: the
 * phone's settings when it will not ask again, and choosing a place by hand always.
 */
export function LocationProblem({ problem, onChooseManually }: Readonly<{
  problem: Exclude<DeviceLocationResult, { ok: true }>;
  onChooseManually: () => void;
}>) {
  const { t } = useTranslation();
  const blocked = problem.reason === 'denied' && !problem.canAskAgain;
  const message = problem.reason === 'failed'
    ? t('location.problem.failed')
    : blocked ? t('location.problem.blocked') : t('location.problem.denied');

  return (
    <View style={styles.box} testID="location-problem">
      <View style={styles.row}>
        <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
        <Text style={styles.text}>{message}</Text>
      </View>
      <View style={styles.actions}>
        {blocked && (
          <TouchableOpacity style={styles.action} onPress={() => Linking.openSettings()}>
            <Ionicons name="settings-outline" size={15} color={Colors.primary} />
            <Text style={styles.actionText}>{t('location.problem.openSettings')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.action} onPress={onChooseManually}>
          <Ionicons name="search-outline" size={15} color={Colors.primary} />
          <Text style={styles.actionText}>{t('location.chooseManually')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 10, padding: 12, borderRadius: 14,
    backgroundColor: 'rgba(229,62,62,0.07)', borderWidth: 1, borderColor: 'rgba(229,62,62,0.25)',
  },
  row:     { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  text:    { flex: 1, fontSize: 13.5, color: Colors.text, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  action: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  actionText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
});
