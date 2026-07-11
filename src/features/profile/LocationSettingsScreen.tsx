import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { userService } from '../../services/userService';

type Props = NativeStackScreenProps<RootStackParamList, 'LocationSettings'>;

async function describe(latitude: number, longitude: number): Promise<string> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    const parts = [place?.city ?? place?.subregion, place?.country].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
  } catch { /* geocoder unavailable — fall through to coordinates */ }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export default function LocationSettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [place, setPlace] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userService.getMe()
      .then(async u => {
        if (u.latitude != null && u.longitude != null) {
          setPlace(await describe(u.latitude, u.longitude));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const updateLocation = async () => {
    setUpdating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(t('profile.locationSettings.permissionNeeded'));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await userService.updateProfile({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setPlace(await describe(loc.coords.latitude, loc.coords.longitude));
    } catch {
      setError(t('profile.locationSettings.updateError'));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.locationSettings.headerTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <GlassCard padding={0}>
          <View style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name="location" size={20} color={Colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t('profile.locationSettings.yourLocation')}</Text>
              {!loaded
                ? <ActivityIndicator size="small" color={Colors.primary} style={{ alignSelf: 'flex-start' }} />
                : <Text style={styles.rowSub}>{place ?? t('profile.locationSettings.notSet')}</Text>
              }
            </View>
          </View>
        </GlassCard>

        <TouchableOpacity
          style={[styles.updateBtn, updating && styles.updateBtnDisabled]}
          onPress={updateLocation}
          disabled={updating}
        >
          <Ionicons name="navigate" size={18} color="#fff" />
          <Text style={styles.updateText}>{updating ? t('profile.locationSettings.updating') : t('profile.locationSettings.updateToCurrentLocation')}</Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.hint}>
          {t('profile.locationSettings.hint')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  body: { paddingHorizontal: 20, paddingTop: 8 },

  row:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(46,158,107,0.10)', alignItems: 'center', justifyContent: 'center' },
  rowText:  { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  rowSub:   { fontSize: 14, color: Colors.textSecondary },

  updateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 13, marginTop: 16,
  },
  updateBtnDisabled: { opacity: 0.6 },
  updateText:        { color: '#fff', fontSize: 15, fontWeight: '700' },

  errorText: { color: Colors.error, fontSize: 13, marginTop: 12, textAlign: 'center' },
  hint:      { fontSize: 13, color: Colors.textSecondary, marginTop: 16, marginHorizontal: 4, lineHeight: 18 },
});
