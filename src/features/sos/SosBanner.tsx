import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { sosService, LostDogAlert } from '../../services/sosService';

/** At most this many rows, so a busy week cannot push a whole tab off the screen. */
const MAX_ROWS = 2;

/**
 * Open lost-dog alerts near you, at the top of the main tabs.
 *
 * <p>The push is the loud part; this is for everyone who has notifications off,
 * or who swiped the push away and opened the app later wondering what it was.
 * Renders nothing when there is no open alert, which is almost always.
 */
export function SosBanner() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [alerts, setAlerts] = useState<LostDogAlert[]>([]);

  useFocusEffect(useCallback(() => {
    let active = true;
    sosService.nearby()
      .then(list => { if (active) setAlerts(list.filter(a => a.open)); })
      .catch(() => {});
    return () => { active = false; };
  }, []));

  if (alerts.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {alerts.slice(0, MAX_ROWS).map(alert => (
        <TouchableOpacity
          key={alert.id}
          style={styles.row}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('SosDetail', { alertId: alert.id })}
        >
          <Text style={styles.emoji}>🚨</Text>
          <Text style={styles.text} numberOfLines={1}>
            {alert.mine
              ? t('sos.banner.mine', { name: alert.dog.name })
              : alert.distanceKm != null
                ? t('sos.banner.nearbyKm', { name: alert.dog.name, km: Math.round(alert.distanceKm) })
                : t('sos.banner.nearby', { name: alert.dog.name })}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 20, gap: 6, marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.error, borderRadius: 14,
    paddingVertical: 9, paddingHorizontal: 12,
  },
  emoji: { fontSize: 15 },
  text:  { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' },
});
