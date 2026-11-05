import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { EventPhoto, SignupMode, schoolService } from '../../services/schoolService';
import { PlaceResult } from '../../services/playdateService';
import { containsProfanity } from '../../utils/profanityFilter';
import { getApiError } from '../../utils/apiError';
import { KEYBOARD_BEHAVIOR } from '../../utils/keyboardBehavior';
import { parsePrice } from '../market/EditListingScreen';
import { shortWeekday } from '../../utils/sittingWindow';

type Props = NativeStackScreenProps<RootStackParamList, 'EditEvent'>;

const MAX_PHOTOS = 5;
const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
const weekdayOf = (d: Date) => WEEKDAYS[(d.getDay() + 6) % 7];
/** YYYY-MM-DD in local time. */
const localDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
type Picker = 'date' | 'start' | 'end' | 'until';
type Photo = { kind: 'existing'; photo: EventPhoto } | { kind: 'new'; uri: string };

function tomorrowAt10(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  return d;
}

/** A school's event: when, how long, where (the school unless picked), price, places, pictures. */
export default function EditEventScreen({ navigation, route }: Readonly<Props>) {
  const { t, i18n } = useTranslation();
  const eventId = route.params?.eventId;
  const [loading, setLoading] = useState(!!eventId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState<Date>(tomorrowAt10());
  // End of the (first) class, on the same day — a start and an end time, like a calendar.
  const [endsAt, setEndsAt] = useState<Date>(() => new Date(tomorrowAt10().getTime() + 3600_000));
  const [weekly, setWeekly] = useState(false);
  const [signupMode, setSignupMode] = useState<SignupMode>('DATE');
  const [repeatDays, setRepeatDays] = useState<string[]>([weekdayOf(tomorrowAt10())]);
  const [until, setUntil] = useState<Date>(() => new Date(Date.now() + 56 * 86400_000));
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [free, setFree] = useState(false);
  const [price, setPrice] = useState('');
  const [places, setPlaces] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);
  const [picker, setPicker] = useState<Picker | null>(null);

  useEffect(() => {
    if (!eventId) return;
    schoolService.event(eventId).then(e => {
      setTitle(e.title);
      setDescription(e.description ?? '');
      const start = new Date(e.startsAt);
      setStartsAt(start);
      if (e.repeatWeekdays?.length && e.occurrenceMinutes) {
        setWeekly(true);
        setRepeatDays(e.repeatWeekdays);
        if (e.signupMode) setSignupMode(e.signupMode);
        setEndsAt(new Date(start.getTime() + e.occurrenceMinutes * 60000));
        if (e.endsAt) setUntil(new Date(e.endsAt));
      } else if (e.endsAt) {
        setEndsAt(new Date(e.endsAt));
      }
      if (e.latitude != null && e.longitude != null && e.placeName !== e.schoolName) {
        setPlace({ name: e.placeName ?? '', address: e.address, latitude: e.latitude, longitude: e.longitude });
      }
      setFree(e.priceRappen == null);
      setPrice(e.priceRappen == null ? '' : String(e.priceRappen / 100));
      setPlaces(e.maxParticipants ? String(e.maxParticipants) : '');
      setPhotos(e.photos.map(photo => ({ kind: 'existing', photo })));
    }).catch(e => setError(getApiError(e))).finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    if (route.params?.pickedPlace) setPlace(route.params.pickedPlace);
  }, [route.params?.pickedPlace]);

  /** Applies a picked value; the end always stays on the start's day and after it. */
  const applyPicked = (d: Date, part: Picker) => {
    if (part === 'until') { setUntil(d); return; }
    if (part === 'end') {
      const end = new Date(startsAt);
      end.setHours(d.getHours(), d.getMinutes(), 0, 0);
      setEndsAt(end);
      return;
    }
    const next = new Date(startsAt);
    if (part === 'date') next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
    else next.setHours(d.getHours(), d.getMinutes(), 0, 0);
    const length = Math.max(15 * 60000, endsAt.getTime() - startsAt.getTime());
    setStartsAt(next);
    setEndsAt(new Date(next.getTime() + length));
    // The first class is always one of the course's days.
    const day = weekdayOf(next);
    setRepeatDays(prev => prev.includes(day) ? prev : [...prev, day]);
  };

  const toggleDay = (day: string) => {
    if (day === weekdayOf(startsAt)) return;
    setRepeatDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const added: Photo = { kind: 'new', uri: result.assets[0].uri };
      setPhotos(prev => [...prev, added].slice(0, MAX_PHOTOS));
    }
  };

  const save = async () => {
    const priceRappen = free ? null : parsePrice(price);
    const maxParticipants = places.trim() ? parseInt(places, 10) : undefined;
    if (!title.trim()) { setError(t('market.edit.titleRequired')); return; }
    if (startsAt.getTime() <= Date.now()) { setError(t('playdates.errors.past')); return; }
    if (endsAt <= startsAt) { setError(t('sitter.request.endBeforeStart')); return; }
    if (weekly && localDay(until) < localDay(startsAt)) { setError(t('sitter.request.untilBeforeStart')); return; }
    if (!free && priceRappen == null) { setError(t('market.edit.priceInvalid')); return; }
    if (maxParticipants !== undefined && (Number.isNaN(maxParticipants) || maxParticipants < 1)) {
      setError(t('school.eventForm.placesInvalid')); return;
    }
    if (containsProfanity(title) || containsProfanity(description)) { setError(t('market.edit.profanity')); return; }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        ...(weekly ? { repeatWeekdays: repeatDays, repeatUntil: localDay(until), signupMode } : {}),
        placeName: place?.name,
        address: place?.address ?? undefined,
        latitude: place?.latitude,
        longitude: place?.longitude,
        priceRappen,
        maxParticipants,
      };
      const saved = eventId ? await schoolService.updateEvent(eventId, payload) : await schoolService.createEvent(payload);
      for (const id of removed) await schoolService.deleteEventPhoto(saved.id, id);
      for (const p of photos) if (p.kind === 'new') await schoolService.addEventPhoto(saved.id, p.uri);
      if (eventId) navigation.goBack();
      else navigation.replace('EventDetail', { eventId: saved.id });
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const dateLabel = startsAt.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'long' });
  const timeLabel = startsAt.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const endLabel = endsAt.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  const untilLabel = until.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'long' });
  const pickerValue = picker === 'end' ? endsAt : picker === 'until' ? until : startsAt;
  const pickerMode: 'date' | 'time' = picker === 'start' || picker === 'end' ? 'time' : 'date';
  const pickerMin = picker === 'date' ? new Date() : picker === 'until' ? startsAt : undefined;

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(eventId ? 'school.eventForm.editTitle' : 'school.eventForm.newTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} /> : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={KEYBOARD_BEHAVIOR}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View style={styles.photoRow}>
              {photos.map((p, i) => (
                <View key={p.kind === 'existing' ? `e${p.photo.id}` : `n${p.uri}`}>
                  <RemoteImage source={{ uri: p.kind === 'existing' ? p.photo.thumbUrl : p.uri }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    hitSlop={8}
                    onPress={() => {
                      if (p.kind === 'existing') setRemoved(prev => [...prev, p.photo.id]);
                      setPhotos(prev => prev.filter((_, j) => j !== i));
                    }}
                  >
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity style={[styles.photo, styles.addPhoto]} onPress={pickPhoto}>
                  <Ionicons name="camera-outline" size={26} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={100}
              placeholder={t('school.eventForm.title')} placeholderTextColor={Colors.textSecondary} testID="event-title" />
            <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} maxLength={2000}
              multiline placeholder={t('school.eventForm.description')} placeholderTextColor={Colors.textSecondary} />

            <View style={styles.chips}>
              {([false, true] as const).map(w => (
                <TouchableOpacity key={String(w)} style={[styles.chip, styles.kindChip, weekly === w && styles.chipActive]}
                  onPress={() => setWeekly(w)} testID={`event-kind-${w ? 'weekly' : 'once'}`}>
                  <Text style={[styles.chipText, weekly === w && styles.chipTextActive]}>
                    {t(w ? 'sitter.request.kind.weekly' : 'sitter.request.kind.once')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.input} onPress={() => setPicker('date')}>
              <Text style={styles.value}>
                {weekly ? t('school.eventForm.firstClass', { date: dateLabel }) : dateLabel}
              </Text>
            </TouchableOpacity>
            {/* Start and end, like a calendar entry. */}
            <View style={styles.twoCol}>
              <TouchableOpacity style={[styles.input, styles.col]} onPress={() => setPicker('start')} testID="event-start">
                <Text style={styles.small}>{t('school.eventForm.starts')}</Text>
                <Text style={styles.value}>{timeLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.input, styles.col]} onPress={() => setPicker('end')} testID="event-end">
                <Text style={styles.small}>{t('school.eventForm.ends')}</Text>
                <Text style={styles.value}>{endLabel}</Text>
              </TouchableOpacity>
            </View>

            {weekly && (
              <>
                <Text style={styles.label}>{t('sitter.request.everyLabel')}</Text>
                <View style={styles.dayRow}>
                  {WEEKDAYS.map(d => (
                    <TouchableOpacity key={d} style={[styles.chip, styles.dayChip, repeatDays.includes(d) && styles.chipActive]}
                      onPress={() => toggleDay(d)} testID={`event-day-${d}`}>
                      <Text style={[styles.chipText, repeatDays.includes(d) && styles.chipTextActive]}>
                        {shortWeekday(d, i18n.language)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity style={styles.input} onPress={() => setPicker('until')} testID="event-until">
                  <Text style={styles.value}>{t('sitter.request.until', { date: untilLabel })}</Text>
                </TouchableOpacity>

                {/* Drop-in classes are picked one by one; a course whose lessons build
                    on each other is signed up for as a whole. */}
                <Text style={styles.label}>{t('school.eventForm.signupLabel')}</Text>
                {(['DATE', 'COURSE'] as SignupMode[]).map(m => (
                  <TouchableOpacity key={m} style={[styles.modeRow, signupMode === m && styles.chipActive]}
                    onPress={() => setSignupMode(m)} testID={`event-signup-${m}`}>
                    <Ionicons name={signupMode === m ? 'radio-button-on' : 'radio-button-off'} size={20}
                      color={signupMode === m ? Colors.primary : Colors.textSecondary} />
                    <View style={styles.modeText}>
                      <Text style={[styles.value, signupMode === m && styles.chipTextActive]}>{t(`school.eventForm.mode${m}`)}</Text>
                      <Text style={styles.small}>{t(`school.eventForm.mode${m}Hint`)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <TouchableOpacity
              style={styles.input}
              onPress={() => navigation.navigate('ParkPicker', { returnTo: 'EditEvent', initialLat: place?.latitude, initialLng: place?.longitude })}
            >
              <Text style={place ? styles.value : styles.placeholder} numberOfLines={2}>
                {place ? [place.name, place.address].filter(Boolean).join(', ') : t('school.eventForm.atSchool')}
              </Text>
            </TouchableOpacity>
            {place && (
              <TouchableOpacity onPress={() => setPlace(null)} style={styles.resetPlace}>
                <Text style={styles.resetText}>{t('school.eventForm.useSchool')}</Text>
              </TouchableOpacity>
            )}

            <View style={styles.freeRow}>
              <Text style={styles.freeLabel}>{t('school.eventForm.free')}</Text>
              <Switch value={free} onValueChange={setFree} trackColor={{ true: Colors.primary }} />
            </View>
            {!free && (
              <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad"
                placeholder={t('school.eventForm.price')} placeholderTextColor={Colors.textSecondary} testID="event-price" />
            )}
            <TextInput style={styles.input} value={places} onChangeText={setPlaces} keyboardType="number-pad"
              placeholder={t('school.eventForm.places')} placeholderTextColor={Colors.textSecondary} />

            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} testID="event-save">
              {saving ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.saveText}>{t(eventId ? 'market.edit.save' : 'market.edit.publish')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={picker !== null} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity onPress={() => setPicker(null)} style={styles.modalDoneWrap}>
                <Text style={styles.modalDone}>{t('common.done')}</Text>
              </TouchableOpacity>
              <DateTimePicker
                value={pickerValue}
                mode={pickerMode}
                display="spinner"
                minimumDate={pickerMin}
                onChange={(_, d) => { if (d && picker) applyPicked(d, picker); }}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && picker && (
        <DateTimePicker
          value={pickerValue}
          mode={pickerMode}
          minimumDate={pickerMin}
          onChange={(_, d) => { const part = picker; setPicker(null); if (d) applyPicked(d, part); }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  photo:  { width: 84, height: 84, borderRadius: 12 },
  addPhoto: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  photoRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: Colors.background, borderRadius: 11 },
  input: {
    backgroundColor: Colors.glass.inputBg, borderWidth: 1, borderColor: Colors.glass.inputBorder,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, marginBottom: 12,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 10 },
  col:    { flex: 1 },
  value:  { fontSize: 15, color: Colors.text },
  placeholder: { fontSize: 15, color: Colors.textSecondary },
  label:  { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  chips:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.glass.inputBg },
  chipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  kindChip: { flex: 1, alignItems: 'center' },
  dayRow:  { flexDirection: 'row', gap: 5, marginBottom: 12 },
  dayChip: { flex: 1, alignItems: 'center', paddingHorizontal: 0 },
  small:   { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  modeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.glass.inputBg,
  },
  modeText: { flex: 1 },
  resetPlace: { marginTop: -6, marginBottom: 12 },
  resetText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  freeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  freeLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  error:  { color: Colors.error, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 30 },
  modalDoneWrap: { alignItems: 'flex-end', padding: 14 },
  modalDone: { fontSize: 16, fontWeight: '700', color: Colors.primary },
});
