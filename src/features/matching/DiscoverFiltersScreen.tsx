import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView,
  StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { userService } from '../../services/userService';
import { bumpDiscoverFiltersVersion } from '../../utils/discoverFilters';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { CustomSlider, GlassRangeMarker } from '../../components/CustomSlider';
import { usePlaceName } from '../../hooks/usePlaceName';
import { DEFAULT_RADIUS_KM } from '../../constants/discover';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'DiscoverFilters'>;

// Both ranges are open at the top: sitting the thumb on the maximum means "and
// older", sent to the server as a cleared bound rather than a literal cap, so an
// 81-year-old with a 12-year-old dog is not quietly excluded by the slider's edge.
const OWNER_AGE_MIN = 18;
const OWNER_AGE_MAX = 80;
const DOG_AGE_MIN = 0;
const DOG_AGE_MAX = 10;

const openEnded = (value: number, max: number) => (value >= max ? `${max}+` : String(value));


// ──────────────────────────────────────────────────────────────────────────────

export default function DiscoverFiltersScreen({ navigation }: Readonly<Props>) {
  const { t } = useTranslation();
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Distance — always on. Starts at the radius the server falls back to when none
  // is saved (DiscoverService.MAX_DISTANCE_KM). It used to start at 25, so a user
  // who had never set a distance and simply opened this screen and saved had their
  // search area silently halved from the 50 km they were actually getting.
  const [distance, setDistance]       = useState(DEFAULT_RADIUS_KM);

  // Where the feed is centred
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Owner age
  const [ageOn, setAgeOn]             = useState(false);
  const [minAge, setMinAge]           = useState(OWNER_AGE_MIN);
  const [maxAge, setMaxAge]           = useState(OWNER_AGE_MAX);
  const [ageSliderWidth, setAgeSliderWidth] = useState(0);

  // Dog age
  const [dogAgeOn, setDogAgeOn]       = useState(false);
  const [minDogAge, setMinDogAge]     = useState(DOG_AGE_MIN);
  const [maxDogAge, setMaxDogAge]     = useState(DOG_AGE_MAX);
  const [dogAgeSliderWidth, setDogAgeSliderWidth] = useState(0);

  useEffect(() => {
    userService.getMe().then(u => {
      // Distance
      if (u.maxDistanceKm != null) setDistance(Math.max(1, Math.min(50, u.maxDistanceKm)));

      // Location the feed is centred on
      if (u.latitude != null && u.longitude != null) {
        setLocation({ latitude: u.latitude, longitude: u.longitude });
      }

      // Owner age
      if (u.minAge != null || u.maxAge != null) {
        setAgeOn(true);
        setMinAge(u.minAge ?? OWNER_AGE_MIN);
        setMaxAge(u.maxAge ?? OWNER_AGE_MAX);
      }

      // Dog age. A cleared bound on the server is the open end of the slider.
      if (u.minDogAge != null || u.maxDogAge != null) {
        setDogAgeOn(true);
        setMinDogAge(u.minDogAge ?? DOG_AGE_MIN);
        setMaxDogAge(u.maxDogAge ?? DOG_AGE_MAX);
      }
    }).finally(() => setLoading(false));
  }, []);

  // The screen has its own back button, so the native edge-swipe-to-go-back gesture is
  // disabled for the whole screen — toggling it reactively per-drag was too late to win
  // the race against the system's own edge gesture recognizer, which made dragging a
  // slider (especially the min-age thumb, which sits near the left edge) frequently get
  // misread as "swipe to dismiss".
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    return () => navigation.setOptions({ gestureEnabled: true });
  }, [navigation]);

  const lockScroll = useCallback(() => setScrollEnabled(false), []);
  const unlockScroll = useCallback(() => setScrollEnabled(true), []);

  const placeName = usePlaceName(location?.latitude, location?.longitude);

  /**
   * Re-centres the feed on where the user is now. Kept here rather than only in
   * Edit Profile because this is the screen you reach when the deck looks wrong,
   * and a stale location is one of the two reasons it can be (the other is the
   * radius, right below).
   */
  const detectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.error'), t('profile.form.locationPermission'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      // Saved immediately rather than on Save: the deck is rebuilt from the
      // server's copy, so an unsaved location would show a place name that the
      // feed underneath it isn't actually using.
      await userService.updateProfile(next);
      setLocation(next);
      bumpDiscoverFiltersVersion();
    } catch {
      Alert.alert(t('common.error'), t('profile.form.locationError'));
    } finally {
      setLocating(false);
    }
  };

  const handleDistanceChange   = useCallback((v: number) => setDistance(v), []);

  const save = async () => {
    setSaving(true);
    try {
      // 0 and -1 are the server's "clear this bound" sentinels (UserService), which
      // is how both the switched-off case and the open top end are expressed.
      await userService.updateProfile({
        maxDistanceKm: distance,
        minAge:    ageOn ? minAge : 0,
        maxAge:    ageOn && maxAge < OWNER_AGE_MAX ? maxAge : 0,
        minDogAge: dogAgeOn ? minDogAge : -1,
        maxDogAge: dogAgeOn && maxDogAge < DOG_AGE_MAX ? maxDogAge : 0,
      });
      bumpDiscoverFiltersVersion();
      navigation.goBack();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? t('matching.filters.saveFailed');
      Alert.alert(t('matching.filters.saveFailedTitle'), msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <FloatingBackground />
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('matching.filters.headerTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Location the feed is centred on ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('matching.filters.location')}</Text>
          <GlassCard>
            <View style={styles.locationRow}>
              <Ionicons
                name={location ? 'location' : 'location-outline'}
                size={18}
                color={location ? Colors.primary : '#e53e3e'}
              />
              <Text style={styles.locationName} numberOfLines={1}>
                {location
                  ? (placeName ?? t('matching.filters.locationSet'))
                  : t('matching.filters.locationMissing')}
              </Text>
            </View>
            <Text style={styles.locationHint}>
              {location
                ? t('matching.filters.locationHint')
                : t('matching.filters.locationMissingHint')}
            </Text>
            <TouchableOpacity
              style={styles.locationBtn}
              onPress={detectLocation}
              disabled={locating}
              activeOpacity={0.7}
            >
              {locating
                ? <ActivityIndicator size="small" color={Colors.primary} />
                : (
                  <>
                    <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
                    <Text style={styles.locationBtnText}>{t('matching.filters.useCurrentLocation')}</Text>
                  </>
                )}
            </TouchableOpacity>
          </GlassCard>
        </View>

        {/* ── Distance (always on) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('matching.filters.distance')}</Text>
          <GlassCard>
            <View style={styles.sliderHeader}>
              <Text style={styles.toggleLabel}>{t('matching.filters.maxDistance')}</Text>
              <Text style={styles.sliderValue}>{t('matching.filters.kmValue', { km: distance })}</Text>
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderEdge}>{t('matching.filters.kmValue', { km: 1 })}</Text>
              <Text style={styles.sliderEdge}>{t('matching.filters.kmValue', { km: 50 })}</Text>
            </View>
            <CustomSlider
              value={distance} min={1} max={50} step={1}
              onChange={handleDistanceChange}
              onDragStart={lockScroll}
              onDragEnd={unlockScroll}
            />
          </GlassCard>
        </View>

        {/* ── Owner age ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('matching.filters.ownerAge')}</Text>
          <GlassCard>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.toggleLabel}>{t('matching.filters.filterByOwnerAge')}</Text>
                <Text style={styles.toggleSub}>
                  {ageOn
                    ? t('matching.filters.showOwnersAged', {
                        min: minAge, max: openEnded(maxAge, OWNER_AGE_MAX) })
                    : t('matching.filters.showingAllAges')}
                </Text>
              </View>
              <Switch value={ageOn} onValueChange={setAgeOn}
                trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#fff" />
            </View>
            {ageOn && (
              <View style={styles.sliderBlock}>
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderEdge}>{OWNER_AGE_MIN}</Text>
                  <Text style={styles.sliderValue}>{minAge}–{openEnded(maxAge, OWNER_AGE_MAX)}</Text>
                  <Text style={styles.sliderEdge}>{OWNER_AGE_MAX}+</Text>
                </View>
                <View
                  style={styles.rangeSliderTrack}
                  onLayout={e => setAgeSliderWidth(e.nativeEvent.layout.width)}
                >
                  {ageSliderWidth > 0 && (
                    <MultiSlider
                      values={[minAge, maxAge]}
                      min={OWNER_AGE_MIN}
                      max={OWNER_AGE_MAX}
                      step={1}
                      sliderLength={ageSliderWidth}
                      allowOverlap={false}
                      minMarkerOverlapDistance={20}
                      touchDimensions={{ height: 60, width: 60, borderRadius: 30, slipDisplacement: 300 }}
                      onValuesChangeStart={lockScroll}
                      onValuesChange={([lo, hi]) => { setMinAge(lo); setMaxAge(hi); }}
                      onValuesChangeFinish={unlockScroll}
                      selectedStyle={{ backgroundColor: Colors.primary }}
                      unselectedStyle={{ backgroundColor: Colors.border }}
                      trackStyle={{ height: 4, borderRadius: 2 }}
                      customMarker={marker => <GlassRangeMarker pressed={marker.pressed ?? false} />}
                      containerStyle={styles.rangeSliderContainer}
                    />
                  )}
                </View>
              </View>
            )}
          </GlassCard>
        </View>

        {/* ── Dog age ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('matching.filters.dogAge')}</Text>
          <GlassCard>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.toggleLabel}>{t('matching.filters.filterByDogAge')}</Text>
                <Text style={styles.toggleSub}>
                  {dogAgeOn
                    ? t('matching.filters.showDogsAged', {
                        min: minDogAge, max: openEnded(maxDogAge, DOG_AGE_MAX) })
                    : t('matching.filters.showingAllDogAges')}
                </Text>
              </View>
              <Switch value={dogAgeOn} onValueChange={setDogAgeOn}
                trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#fff" />
            </View>

            {dogAgeOn && (
              <View style={styles.sliderBlock}>
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderEdge}>{DOG_AGE_MIN}</Text>
                  <Text style={styles.sliderValue}>
                    {minDogAge}–{openEnded(maxDogAge, DOG_AGE_MAX)}
                  </Text>
                  <Text style={styles.sliderEdge}>{DOG_AGE_MAX}+</Text>
                </View>
                <View
                  style={styles.rangeSliderTrack}
                  onLayout={e => setDogAgeSliderWidth(e.nativeEvent.layout.width)}
                >
                  {dogAgeSliderWidth > 0 && (
                    <MultiSlider
                      values={[minDogAge, maxDogAge]}
                      min={DOG_AGE_MIN}
                      max={DOG_AGE_MAX}
                      step={1}
                      sliderLength={dogAgeSliderWidth}
                      allowOverlap={false}
                      minMarkerOverlapDistance={20}
                      touchDimensions={{ height: 60, width: 60, borderRadius: 30, slipDisplacement: 300 }}
                      onValuesChangeStart={lockScroll}
                      onValuesChange={([lo, hi]) => { setMinDogAge(lo); setMaxDogAge(hi); }}
                      onValuesChangeFinish={unlockScroll}
                      selectedStyle={{ backgroundColor: Colors.primary }}
                      unselectedStyle={{ backgroundColor: Colors.border }}
                      trackStyle={{ height: 4, borderRadius: 2 }}
                      customMarker={marker => <GlassRangeMarker pressed={marker.pressed ?? false} />}
                      containerStyle={styles.rangeSliderContainer}
                    />
                  )}
                </View>
                <Text style={styles.toggleSub}>{t('matching.filters.dogAgeHint')}</Text>
              </View>
            )}
          </GlassCard>
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>{t('matching.filters.savePreferences')}</Text>
          }
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  scroll:       { padding: 20, paddingTop: 12 },
  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },
  locationRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationName:    { flexShrink: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  locationHint:    { fontSize: 13, color: Colors.textSecondary, marginTop: 6, lineHeight: 18 },
  locationBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(46,158,107,0.10)' },
  locationBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  toggleRow:   { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  toggleSub:   { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sliderBlock:  { marginTop: 16 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sliderEdge:   { fontSize: 12, color: Colors.textSecondary },
  sliderValue:  { fontSize: 16, fontWeight: '700', color: Colors.primary },

  rangeSliderTrack:     { marginTop: 4 },
  rangeSliderContainer: { height: 44, justifyContent: 'center' },

  dogPicker:        { marginTop: 16, marginBottom: 4 },
  dogPickerContent: { gap: 8, paddingHorizontal: 2 },
  dogChip:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  dogChipSelected:  { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dogChipText:      { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  dogChipTextSelected: { color: '#fff' },
  dogChipAge:       { fontSize: 11, color: Colors.textSecondary, marginTop: 1 },

  noDogRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noDogText:{ fontSize: 14, color: Colors.textSecondary, flex: 1 },

  saveBtn:         { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
});
