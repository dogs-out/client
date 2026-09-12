import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Switch,
  Text, TouchableOpacity, View,
} from 'react-native';
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
import { RemoteImage } from '../../components/ui/RemoteImage';
import { CustomSlider } from '../../components/CustomSlider';
import {
  userService, SittableDog, STATUS_SHARES_LOCATION, WalkStatus,
} from '../../services/userService';
import { STATUS_DURATIONS, durationLabel, nearestStop } from '../../utils/statusDuration';
import { getApiError } from '../../utils/apiError';

type Props = NativeStackScreenProps<RootStackParamList, 'SetStatus'>;

interface Point {
  latitude: number;
  longitude: number;
  /** Set when the point came from the map rather than the phone. */
  name?: string;
}

const ICONS: Record<WalkStatus, string> = {
  WALKING:     'walk-outline',
  AT_THE_PARK: 'leaf-outline',
  SITTING:     'paw-outline',
  AT_HOME:     'home-outline',
  ON_VACATION: 'airplane-outline',
  BUSY:        'time-outline',
};

/**
 * Whether to offer walking or sitting, which is really a question about whose
 * dog is involved.
 *
 * <p>Someone with no dog cannot be walking theirs, so for a sitter that option is
 * replaced by sitting, which names a dog belonging to one of their matches. People
 * who are both get both — plenty of sitters own a dog of their own.
 */
export function statusesFor(hasDog: boolean, isSitter: boolean): WalkStatus[] {
  const out: WalkStatus[] = [];
  if (hasDog) out.push('WALKING');
  if (isSitter) out.push('SITTING');
  // Someone who is neither still needs a way to say they are out.
  if (out.length === 0) out.push('WALKING');
  return [...out, 'AT_THE_PARK', 'AT_HOME', 'ON_VACATION', 'BUSY'];
}

export default function SetStatusScreen({ navigation, route }: Readonly<Props>) {
  const { t } = useTranslation();

  const [status, setStatus] = useState<WalkStatus | null>(null);
  const [hours, setHours] = useState(2);
  const [sharePoint, setSharePoint] = useState(true);
  const [point, setPoint] = useState<Point | null>(null);
  const [dogs, setDogs] = useState<SittableDog[]>([]);
  const [dogId, setDogId] = useState<number | null>(null);
  const [options, setOptions] = useState<WalkStatus[]>(statusesFor(true, false));

  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const picked = route.params?.pickedPlace;

  useEffect(() => {
    userService.getMe()
      .then(me => {
        setOptions(statusesFor(me.hasDog ?? true, me.isSitter ?? false));
        if (!me.walkStatus) return;
        setStatus(me.walkStatus);
        setDogId(me.walkStatusDogId);
        if (me.walkStatusLatitude != null && me.walkStatusLongitude != null) {
          setPoint({
            latitude: me.walkStatusLatitude,
            longitude: me.walkStatusLongitude,
            name: me.walkStatusPlaceName ?? undefined,
          });
        }
      })
      .catch(() => { /* the defaults still make a usable screen */ });
    userService.getSittableDogs().then(setDogs).catch(() => setDogs([]));
  }, []);

  // Coming back from the map picker, which navigates here carrying the place.
  useEffect(() => {
    if (!picked) return;
    setPoint({ latitude: picked.latitude, longitude: picked.longitude, name: picked.name });
    setSharePoint(true);
    navigation.setParams({ pickedPlace: undefined });
  }, [picked, navigation]);

  const stops = useMemo(
    () => (status ? STATUS_DURATIONS[status] : STATUS_DURATIONS.WALKING),
    [status]);

  const chooseStatus = (next: WalkStatus | null) => {
    setStatus(next);
    // Each status has its own range, so carry the span across rather than reset
    // it — two hours becomes the shortest holiday, not a silent jump to weeks.
    if (next) setHours(nearestStop(next, hours));
  };

  const canShare = status !== null && STATUS_SHARES_LOCATION[status];
  const needsDog = status === 'SITTING';

  const forHumans = (h: number) => {
    const { key, count } = durationLabel(h);
    return t(key, { count });
  };

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
    if (needsDog && dogId === null) {
      Alert.alert(t('common.error'), t('whosOutside.pickADog'));
      return;
    }
    setSaving(true);
    try {
      const shares = canShare && sharePoint && point !== null;
      await userService.setStatus({
        status,
        hours,
        ...(shares ? { latitude: point.latitude, longitude: point.longitude } : {}),
        ...(shares && point.name ? { placeName: point.name } : {}),
        ...(needsDog && dogId !== null ? { dogId } : {}),
      });
      // popToTop, not goBack: the map picker may still be on the stack behind
      // this screen, and going back one step lands on it — so saving a status
      // dropped people back into picking a place they had just finished picking.
      navigation.popToTop();
    } catch (e) {
      Alert.alert(t('common.error'), getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const renderDog = (dog: SittableDog) => {
    const selected = dogId === dog.dogId;
    return (
      <TouchableOpacity
        key={dog.dogId}
        style={styles.dogRow}
        onPress={() => setDogId(selected ? null : dog.dogId)}
      >
        {dog.profilePicture
          ? <RemoteImage source={{ uri: dog.profilePicture }} style={styles.dogAvatar} />
          : <View style={[styles.dogAvatar, styles.dogAvatarPlaceholder]}><Text>🐶</Text></View>}
        <View style={{ flex: 1 }}>
          <Text style={[styles.dogName, selected && styles.dogNameSelected]} numberOfLines={1}>{dog.name}</Text>
          <Text style={styles.dogOwner} numberOfLines={1}>
            {t('whosOutside.dogOf', { name: dog.ownerName })}
          </Text>
        </View>
        {selected && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
      </TouchableOpacity>
    );
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
          {options.map(option => {
            const selected = status === option;
            return (
              <TouchableOpacity
                key={option}
                style={styles.option}
                onPress={() => chooseStatus(selected ? null : option)}
              >
                <Ionicons
                  name={ICONS[option] as never}
                  size={19}
                  color={selected ? Colors.primary : Colors.textSecondary}
                />
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {t(`whosOutside.status.${option}`)}
                </Text>
                {selected && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            );
          })}
          <Text style={styles.hint}>{t('whosOutside.clearHint')}</Text>
        </GlassCard>

        {needsDog && (
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('whosOutside.whichDog')}</Text>
            {dogs.length === 0
              ? <Text style={styles.hint}>{t('whosOutside.noSittableDogs')}</Text>
              : dogs.map(renderDog)}
          </GlassCard>
        )}

        {status !== null && (
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('whosOutside.howLong')}</Text>
            <Text style={styles.durationValue}>{forHumans(hours)}</Text>
            <CustomSlider
              value={Math.max(0, stops.indexOf(hours))}
              min={0}
              max={stops.length - 1}
              step={1}
              onChange={index => setHours(stops[index])}
              onDragStart={() => setScrollEnabled(false)}
              onDragEnd={() => setScrollEnabled(true)}
            />
            <View style={styles.edges}>
              <Text style={styles.edge}>{forHumans(stops[0])}</Text>
              <Text style={styles.edge}>{forHumans(stops[stops.length - 1])}</Text>
            </View>
          </GlassCard>
        )}

        {canShare && (
          <GlassCard style={styles.card}>
            <View style={styles.shareRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.sectionLabel}>{t('whosOutside.sharePoint')}</Text>
                <Text style={styles.hint}>{t('whosOutside.sharePointHint')}</Text>
              </View>
              <Switch
                value={sharePoint}
                onValueChange={setSharePoint}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor="#fff"
              />
            </View>

            {sharePoint && (
              <>
                {point && (
                  <View style={styles.pointPill}>
                    <Ionicons name="location" size={14} color={Colors.primary} />
                    <Text style={styles.pointText} numberOfLines={1}>
                      {point.name ?? t('whosOutside.currentLocation')}
                    </Text>
                    <TouchableOpacity onPress={() => setPoint(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={17} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.pickRow}>
                  <TouchableOpacity style={styles.pickBtn} onPress={detect} disabled={locating}>
                    {locating
                      ? <ActivityIndicator size="small" color={Colors.primary} />
                      : (
                        <>
                          <Ionicons name="navigate-outline" size={15} color={Colors.textSecondary} />
                          <Text style={styles.pickText} numberOfLines={2}>{t('whosOutside.usePoint')}</Text>
                        </>
                      )}
                  </TouchableOpacity>

                  {/* Naming where you are heading matters as much as where you are:
                      "I'll be at Irchelpark" is the invitation, not a pin dropped
                      once you have already arrived. */}
                  <TouchableOpacity
                    style={styles.pickBtn}
                    onPress={() => navigation.navigate('ParkPicker', {
                      returnTo: 'SetStatus',
                      initialLat: point?.latitude,
                      initialLng: point?.longitude,
                    })}
                  >
                    <Ionicons name="map-outline" size={15} color={Colors.textSecondary} />
                    <Text style={styles.pickText} numberOfLines={2}>{t('whosOutside.pickOnMap')}</Text>
                  </TouchableOpacity>
                </View>
              </>
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
  hint: { fontSize: 12, color: Colors.textSecondary, marginTop: 6, lineHeight: 17 },

  sectionLabel:  { fontSize: 14, fontWeight: '700', color: Colors.text },
  durationValue: { fontSize: 20, fontWeight: '800', color: Colors.text, marginTop: 4 },
  edges: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -6 },
  edge:  { fontSize: 12, color: Colors.textSecondary },

  dogRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  dogAvatar: { width: 40, height: 40, borderRadius: 20 },
  dogAvatarPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  dogName:  { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  dogNameSelected: { color: Colors.text, fontWeight: '700' },
  dogOwner: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },

  shareRow: { flexDirection: 'row', alignItems: 'center' },
  pointPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: 12, paddingHorizontal: 11, paddingVertical: 9,
    borderRadius: 12, backgroundColor: 'rgba(46,158,107,0.10)',
  },
  pointText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text },

  pickRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  pickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, paddingHorizontal: 8,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
  },
  pickText: { flexShrink: 1, fontSize: 13, fontWeight: '700', color: Colors.textSecondary },

  saveBtn:  { marginTop: 4 },
  saveText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
});
