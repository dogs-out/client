import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, PanResponder, SafeAreaView, ScrollView,
  StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { userService } from '../../services/userService';
import { dogService, Dog } from '../../services/dogService';
import { bumpDiscoverFiltersVersion } from '../../utils/discoverFilters';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'DiscoverFilters'>;

function dogAgeYears(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

// ─── Pure-JS slider ────────────────────────────────────────────────────────────
function CustomSlider({ value, min, max, step, onChange, onDragStart, onDragEnd }: {
  value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const stateRef = useRef({ trackWidth: 0, min, max, step });
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { stateRef.current = { trackWidth, min, max, step }; }, [trackWidth, min, max, step]);

  const compute = (x: number) => {
    const { trackWidth: w, min: lo, max: hi, step: s } = stateRef.current;
    if (w === 0) return;
    const ratio = Math.max(0, Math.min(1, x / w));
    onChangeRef.current(Math.round((lo + ratio * (hi - lo)) / s) * s);
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: e => { onDragStart?.(); compute(e.nativeEvent.locationX); },
    onPanResponderMove: e => compute(e.nativeEvent.locationX),
    onPanResponderRelease: () => onDragEnd?.(),
    onPanResponderTerminate: () => onDragEnd?.(),
  })).current;

  const fillPct = trackWidth > 0 ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <View
      style={sliderStyles.track}
      onLayout={e => { const w = e.nativeEvent.layout.width; setTrackWidth(w); stateRef.current.trackWidth = w; }}
      {...pan.panHandlers}
    >
      <View style={sliderStyles.rail} />
      <View style={[sliderStyles.fill, { width: `${fillPct}%` }]} />
      <View style={[sliderStyles.thumb, { left: `${fillPct}%`, transform: [{ translateX: -12 }] }]} />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  track: { height: 44, justifyContent: 'center', position: 'relative' },
  rail:  { height: 4, backgroundColor: Colors.border, borderRadius: 2, position: 'absolute', left: 0, right: 0 },
  fill:  { height: 4, backgroundColor: Colors.primary, borderRadius: 2, position: 'absolute', left: 0 },
  thumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, position: 'absolute', top: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
});
// ──────────────────────────────────────────────────────────────────────────────

function Stepper({ value, min, max, onDecrement, onIncrement }: {
  value: number; min: number; max: number;
  onDecrement: () => void; onIncrement: () => void;
}) {
  return (
    <View style={stepperStyles.row}>
      <TouchableOpacity style={stepperStyles.btn} onPress={onDecrement} disabled={value <= min}>
        <Ionicons name="remove" size={20} color={value <= min ? Colors.border : Colors.primary} />
      </TouchableOpacity>
      <Text style={stepperStyles.value}>{value}</Text>
      <TouchableOpacity style={stepperStyles.btn} onPress={onIncrement} disabled={value >= max}>
        <Ionicons name="add" size={20} color={value >= max ? Colors.border : Colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: 16 },
  btn:   { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 22, fontWeight: '800', color: Colors.text, minWidth: 36, textAlign: 'center' },
});

// ──────────────────────────────────────────────────────────────────────────────

export default function DiscoverFiltersScreen({ navigation }: Props) {
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Distance — always on
  const [distance, setDistance]       = useState(25);

  // Owner age
  const [ageOn, setAgeOn]             = useState(false);
  const [minAge, setMinAge]           = useState(18);
  const [maxAge, setMaxAge]           = useState(50);

  // Dog age
  const [dogs, setDogs]               = useState<Dog[]>([]);
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null);
  const [dogAgeOn, setDogAgeOn]       = useState(false);
  const [dogAgeTolerance, setDogAgeTolerance] = useState(3);

  useEffect(() => {
    Promise.all([userService.getMe(), dogService.getMyDogs()]).then(([u, myDogs]) => {
      // Distance
      if (u.maxDistanceKm != null) setDistance(Math.max(1, Math.min(50, u.maxDistanceKm)));

      // Owner age
      if (u.minAge != null || u.maxAge != null) {
        setAgeOn(true);
        if (u.minAge != null) setMinAge(u.minAge);
        if (u.maxAge != null) setMaxAge(u.maxAge);
      }

      // Dogs + dog age tolerance
      setDogs(myDogs);
      if (myDogs.length > 0) {
        setSelectedDogId(myDogs[0].id);
        if (u.maxDogAge != null) {
          setDogAgeOn(true);
          // Find the dog whose age reproduces the saved min/max range,
          // so reopening the screen restores the filter as it was saved
          for (const dog of myDogs) {
            const age = dogAgeYears(dog.dateOfBirth);
            if (age === null) continue;
            const tol = u.maxDogAge - age;
            if (tol >= 1 && tol <= 6 && Math.max(0, age - tol) === (u.minDogAge ?? 0)) {
              setSelectedDogId(dog.id);
              setDogAgeTolerance(tol);
              break;
            }
          }
        }
      }
    }).finally(() => setLoading(false));
  }, []);

  const lockScroll = useCallback(() => {
    setScrollEnabled(false);
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  const unlockScroll = useCallback(() => {
    setScrollEnabled(true);
    navigation.setOptions({ gestureEnabled: true });
  }, [navigation]);

  const handleDistanceChange   = useCallback((v: number) => setDistance(v), []);
  const handleDogAgeChange     = useCallback((v: number) => setDogAgeTolerance(v), []);

  const selectedDog = dogs.find(d => d.id === selectedDogId) ?? null;
  const selectedDogAge = selectedDog ? dogAgeYears(selectedDog.dateOfBirth) : null;

  const save = async () => {
    setSaving(true);
    try {
      let minDogAge: number = -1;
      let maxDogAge: number = 0;
      if (dogAgeOn && selectedDogAge !== null) {
        minDogAge = Math.max(0, selectedDogAge - dogAgeTolerance);
        maxDogAge = selectedDogAge + dogAgeTolerance;
      }
      await userService.updateProfile({
        maxDistanceKm: distance,
        minAge: ageOn ? minAge : 0,
        maxAge: ageOn ? maxAge : 0,
        minDogAge,
        maxDogAge,
      });
      bumpDiscoverFiltersVersion();
      navigation.goBack();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Your preferences could not be saved. Please try again.';
      Alert.alert('Save failed', msg);
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
        <Text style={styles.headerTitle}>Discovery Preferences</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView scrollEnabled={scrollEnabled} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Distance (always on) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Distance</Text>
          <GlassCard>
            <View style={styles.sliderHeader}>
              <Text style={styles.toggleLabel}>Maximum distance</Text>
              <Text style={styles.sliderValue}>{distance} km</Text>
            </View>
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderEdge}>1 km</Text>
              <Text style={styles.sliderEdge}>50 km</Text>
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
          <Text style={styles.sectionTitle}>Owner age</Text>
          <GlassCard>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.toggleLabel}>Filter by owner age</Text>
                <Text style={styles.toggleSub}>
                  {ageOn ? `Show owners aged ${minAge}–${maxAge}` : 'Showing all ages'}
                </Text>
              </View>
              <Switch value={ageOn} onValueChange={setAgeOn}
                trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#fff" />
            </View>
            {ageOn && (
              <View style={styles.ageRow}>
                <View style={styles.agePicker}>
                  <Text style={styles.ageLabel}>Min</Text>
                  <Stepper value={minAge} min={18} max={maxAge - 1}
                    onDecrement={() => setMinAge(a => Math.max(18, a - 1))}
                    onIncrement={() => setMinAge(a => Math.min(maxAge - 1, a + 1))} />
                </View>
                <View style={styles.ageDivider} />
                <View style={styles.agePicker}>
                  <Text style={styles.ageLabel}>Max</Text>
                  <Stepper value={maxAge} min={minAge + 1} max={80}
                    onDecrement={() => setMaxAge(a => Math.max(minAge + 1, a - 1))}
                    onIncrement={() => setMaxAge(a => Math.min(80, a + 1))} />
                </View>
              </View>
            )}
          </GlassCard>
        </View>

        {/* ── Dog age ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dog age</Text>
          <GlassCard>
            {dogs.length === 0 ? (
              <View style={styles.noDogRow}>
                <Ionicons name="paw-outline" size={20} color={Colors.textSecondary} />
                <Text style={styles.noDogText}>Add a dog to your profile to use this filter</Text>
              </View>
            ) : (
              <>
                <View style={styles.toggleRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.toggleLabel}>Filter by dog age</Text>
                    <Text style={styles.toggleSub}>
                      {dogAgeOn && selectedDogAge !== null
                        ? `Show dogs aged ${Math.max(0, selectedDogAge - dogAgeTolerance)}–${selectedDogAge + dogAgeTolerance} yrs`
                        : dogAgeOn && selectedDogAge === null
                        ? `±${dogAgeTolerance} years (dog has no birthday set)`
                        : 'Showing all dog ages'}
                    </Text>
                  </View>
                  <Switch value={dogAgeOn} onValueChange={setDogAgeOn}
                    trackColor={{ false: Colors.border, true: Colors.primary }} thumbColor="#fff" />
                </View>

                {/* Dog picker — shown when filter is on and user has multiple dogs */}
                {dogAgeOn && dogs.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dogPicker} contentContainerStyle={styles.dogPickerContent}>
                    {dogs.map(dog => {
                      const selected = dog.id === selectedDogId;
                      return (
                        <TouchableOpacity
                          key={dog.id}
                          style={[styles.dogChip, selected && styles.dogChipSelected]}
                          onPress={() => setSelectedDogId(dog.id)}
                        >
                          <Text style={[styles.dogChipText, selected && styles.dogChipTextSelected]}>
                            {dog.name}
                          </Text>
                          {dogAgeYears(dog.dateOfBirth) !== null && (
                            <Text style={[styles.dogChipAge, selected && styles.dogChipTextSelected]}>
                              {dogAgeYears(dog.dateOfBirth)} yr
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {dogAgeOn && (
                  <View style={styles.sliderBlock}>
                    {selectedDogAge !== null ? (
                      <View style={styles.sliderLabels}>
                        <Text style={styles.sliderEdge}>±1 yr</Text>
                        <Text style={styles.sliderValue}>±{dogAgeTolerance} yr{dogAgeTolerance === 1 ? '' : 's'}</Text>
                        <Text style={styles.sliderEdge}>±6 yrs</Text>
                      </View>
                    ) : (
                      <Text style={[styles.toggleSub, { marginBottom: 8 }]}>
                        No birthday set for {selectedDog?.name} — range shown as ±{dogAgeTolerance} yrs
                      </Text>
                    )}
                    <CustomSlider
                      value={dogAgeTolerance} min={1} max={6} step={1}
                      onChange={handleDogAgeChange}
                      onDragStart={lockScroll}
                      onDragEnd={unlockScroll}
                    />
                  </View>
                )}
              </>
            )}
          </GlassCard>
        </View>

        <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={save} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Save preferences</Text>
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

  toggleRow:   { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  toggleSub:   { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sliderBlock:  { marginTop: 16 },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sliderEdge:   { fontSize: 12, color: Colors.textSecondary },
  sliderValue:  { fontSize: 16, fontWeight: '700', color: Colors.primary },

  ageRow:    { flexDirection: 'row', marginTop: 20, alignItems: 'center' },
  agePicker: { flex: 1, alignItems: 'center' },
  ageLabel:  { fontSize: 12, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  ageDivider:{ width: 1, height: 60, backgroundColor: Colors.border, marginHorizontal: 8 },

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
