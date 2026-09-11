import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { CustomSlider } from '../../components/CustomSlider';
import { userService, STATUS_SHARES_LOCATION, WalkStatus } from '../../services/userService';
import { getApiError } from '../../utils/apiError';
import { STATUS_DURATIONS, durationLabel } from '../../utils/statusDuration';

type Props = NativeStackScreenProps<RootStackParamList, 'SetStatus'>;

const STATUSES: { value: WalkStatus; icon: string }[] = [
  { value: 'WALKING',     icon: 'walk-outline' },
  { value: 'AT_HOME',     icon: 'home-outline' },
  { value: 'ON_VACATION', icon: 'airplane-outline' },
  { value: 'BUSY',        icon: 'time-outline' },
];

export default function SetStatusScreen({ navigation }: Readonly<Props>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<WalkStatus | null>(null);
  const [durationIndex, setDurationIndex] = useState(2);      // 4 hours
  const [sharePoint, setSharePoint] = useState(true);
  const [point, setPoint] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  useEffect(() => {
    userService.getMe().then(me => setStatus(me.walkStatus)).catch(() => {});
  }, []);

  const canShare = status !== null && STATUS_SHARES_LOCATION[status];

  const detect = async () => {
    setLocating(true);
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync();
      if (permission !== 'granted') {
        Alert.alert(t('common.error'), t('profile.form.locationPermission'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPoint({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    } catch {
      Alert.alert(t('common.error'), t('profile.form.locationError'));
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const shares = canShare && sharePoint && point !== null;
      await userService.setStatus({
        status,
        hours: STATUS_DURATIONS[durationIndex],
        ...(shares ? { latitude: point.latitude, longitude: point.longitude } : {}),
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert(t('common.error'), getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const forHumans = (hours: number) => {
    const { key, count } = durationLabel(hours);
    return t(key, { count });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('whosOutside.setStatusTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.card}>
          {STATUSES.map(option => {
            const selected = status === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={styles.option}
                onPress={() => setStatus(selected ? null : option.value)}
              >
                <Ionicons
                  name={option.icon as never}
                  size={19}
                  color={selected ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {t(`whosOutside.status.${option.value}`)}
                </Text>
                {selected && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            );
          })}
          <Text style={styles.clearHint}>{t('whosOutside.clearHint')}</Text>
        </GlassCard>

        {status !== null && (
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('whosOutside.howLong')}</Text>
            <Text style={styles.durationValue}>{forHumans(STATUS_DURATIONS[durationIndex])}</Text>
            <CustomSlider
              value={durationIndex}
              min={0}
              max={STATUS_DURATIONS.length - 1}
              step={1}
              onChange={setDurationIndex}
              onDragStart={() => setScrollEnabled(false)}
              onDragEnd={() => setScrollEnabled(true)}
            />
            <View style={styles.durationEdges}>
              <Text style={styles.edge}>{forHumans(STATUS_DURATIONS[0])}</Text>
              <Text style={styles.edge}>{forHumans(STATUS_DURATIONS[STATUS_DURATIONS.length - 1])}</Text>
            </View>
          </GlassCard>
        )}

        {canShare && (
          <GlassCard style={styles.card}>
            <View style={styles.shareRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.sectionLabel}>{t('whosOutside.sharePoint')}</Text>
                <Text style={styles.shareHint}>{t('whosOutside.sharePointHint')}</Text>
              </View>
              <Switch
                value={sharePoint}
                onValueChange={setSharePoint}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {sharePoint && (
              <TouchableOpacity style={styles.locateBtn} onPress={detect} disabled={locating}>
                {locating
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : (
                    <>
                      <Ionicons
                        name={point ? 'location' : 'navigate-outline'}
                        size={16}
                        color={point ? Colors.primary : Colors.textSecondary}
                      />
                      <Text style={[styles.locateText, point && styles.locateTextSet]}>
                        {point ? t('whosOutside.pointSet') : t('whosOutside.usePoint')}
                      </Text>
                    </>
                  )}
              </TouchableOpacity>
            )}
          </GlassCard>
        )}

        <GlassButton onPress={save} disabled={saving} style={styles.saveBtn}>
          {saving
            ? <ActivityIndicator color={Colors.text} />
            : <Text style={styles.saveText}>
                {status === null ? t('whosOutside.clearStatus') : t('whosOutside.saveStatus')}
              </Text>
          }
        </GlassButton>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  card:   { marginBottom: 14 },

  option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  optionText: { flex: 1, fontSize: 15, color: Colors.textSecondary },
  optionTextSelected: { color: Colors.text, fontWeight: '700' },
  clearHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 6, lineHeight: 17 },

  sectionLabel:   { fontSize: 14, fontWeight: '700', color: Colors.text },
  durationValue:  { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 4 },
  durationEdges:  { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  edge:           { fontSize: 12, color: Colors.textSecondary },

  shareRow:  { flexDirection: 'row', alignItems: 'center' },
  shareHint: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, lineHeight: 17 },
  locateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 12, paddingVertical: 11,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
  },
  locateText:    { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  locateTextSet: { color: Colors.primary },

  saveBtn:  { marginTop: 4 },
  saveText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
});
