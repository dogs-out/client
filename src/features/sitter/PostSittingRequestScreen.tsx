import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { KEYBOARD_BEHAVIOR } from '../../utils/keyboardBehavior';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { dogService, Dog } from '../../services/dogService';
import { sitterService } from '../../services/sitterService';
import { getApiError } from '../../utils/apiError';

type Props = NativeStackScreenProps<RootStackParamList, 'PostSittingRequest'>;

/** A request a few minutes from now is almost always a mis-tap, not a plan. */
const DEFAULT_LEAD_HOURS = 2;
const DEFAULT_LENGTH_HOURS = 4;

/**
 * Asking for a sitter for a particular window.
 *
 * <p>The dogs are picked rather than assumed even when there is only one: the
 * request is read by strangers deciding whether they can take it, and "which
 * dogs" is the part that decides it.
 */
export default function PostSittingRequestScreen({ navigation }: Readonly<Props>) {
  const { t, i18n } = useTranslation();

  const [dogs, setDogs] = useState<Dog[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [start, setStart] = useState(() => roundToNextHour(DEFAULT_LEAD_HOURS));
  const [end, setEnd] = useState(() => roundToNextHour(DEFAULT_LEAD_HOURS + DEFAULT_LENGTH_HOURS));
  const [note, setNote] = useState('');
  const [picker, setPicker] = useState<'start-date' | 'start-time' | 'end-time' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dogService.getMyDogs()
      .then(mine => {
        setDogs(mine);
        // One dog is not a choice, so make it for them.
        if (mine.length === 1) setSelected([mine[0].id]);
      })
      .catch(() => setError(t('sitter.request.loadFailed')));
  }, [t]);

  const toggleDog = (id: number) =>
    setSelected(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);

  /** Keeps the end after the start, by moving it rather than refusing to save. */
  const changeStart = (next: Date) => {
    setStart(next);
    if (end <= next) setEnd(new Date(next.getTime() + DEFAULT_LENGTH_HOURS * 3600_000));
  };

  /** What a picked value means depends on which field opened the picker. */
  const applyPicked = (chosen?: Date) => {
    if (!chosen) return;
    if (picker === 'end-time') {
      // The end keeps the start's day; only the clock time is being set.
      setEnd(withTimeFrom(start, chosen));
    } else if (picker === 'start-time') {
      changeStart(withTimeFrom(start, chosen));
    } else if (picker === 'start-date') {
      changeStart(withDateFrom(chosen, start));
    }
  };

  const submit = async () => {
    if (selected.length === 0) { setError(t('sitter.request.pickADog')); return; }
    if (end <= start) { setError(t('sitter.request.endBeforeStart')); return; }

    setSaving(true);
    setError(null);
    try {
      await sitterService.createRequest({
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        dogIds: selected,
        note: note.trim() || undefined,
      });
      navigation.goBack();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' });
  const formatTime = (d: Date) =>
    d.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('sitter.request.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={KEYBOARD_BEHAVIOR}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('sitter.request.whenLabel')}</Text>

            <TouchableOpacity style={styles.row} onPress={() => setPicker('start-date')}>
              <Ionicons name="calendar-outline" size={17} color={Colors.primary} />
              <Text style={styles.rowValue}>{formatDate(start)}</Text>
            </TouchableOpacity>

            <View style={styles.timeRow}>
              <TouchableOpacity style={[styles.row, styles.timeCell]} onPress={() => setPicker('start-time')}>
                <Ionicons name="time-outline" size={17} color={Colors.primary} />
                <Text style={styles.rowValue}>{formatTime(start)}</Text>
              </TouchableOpacity>
              <Text style={styles.toLabel}>–</Text>
              <TouchableOpacity style={[styles.row, styles.timeCell]} onPress={() => setPicker('end-time')}>
                <Ionicons name="time-outline" size={17} color={Colors.primary} />
                <Text style={styles.rowValue}>{formatTime(end)}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('sitter.request.whichDogs')}</Text>
            {dogs.length === 0
              ? <Text style={styles.hint}>{t('sitter.request.noDogs')}</Text>
              : dogs.map(dog => {
                  const picked = selected.includes(dog.id);
                  return (
                    <TouchableOpacity key={dog.id} style={styles.dogRow} onPress={() => toggleDog(dog.id)}>
                      {dog.profilePicture
                        ? <RemoteImage source={{ uri: dog.profilePicture }} style={styles.dogAvatar} />
                        : <View style={[styles.dogAvatar, styles.dogPlaceholder]}><Text>🐶</Text></View>}
                      <Text style={[styles.dogName, picked && styles.dogNamePicked]} numberOfLines={1}>
                        {dog.name}
                      </Text>
                      <Ionicons
                        name={picked ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={picked ? Colors.primary : Colors.border}
                      />
                    </TouchableOpacity>
                  );
                })}
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('sitter.request.noteLabel')}</Text>
            <TextInput
              style={styles.noteInput}
              placeholder={t('sitter.request.notePlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={500}
            />
          </GlassCard>

          {error && <Text style={styles.error}>{error}</Text>}

          <GlassButton onPress={submit} disabled={saving} style={styles.submit}>
            {saving
              ? <ActivityIndicator color={Colors.text} />
              : <Text style={styles.submitText}>{t('sitter.request.post')}</Text>}
          </GlassButton>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Android opens its own dialog; iOS would otherwise render the wheel inline
          wherever it happens to sit, which put it in the bottom-left corner with
          no relation to the field being edited. Same sheet as the playdate form. */}
      {picker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={picker === 'end-time' ? end : start}
          mode={picker === 'start-date' ? 'date' : 'time'}
          minimumDate={picker === 'start-date' ? new Date() : undefined}
          onChange={(_, chosen) => { setPicker(null); applyPicked(chosen); }}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={picker !== null} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setPicker(null)}>
                  <Text style={styles.modalDone}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={picker === 'end-time' ? end : start}
                mode={picker === 'start-date' ? 'date' : 'time'}
                display="spinner"
                // Nothing in the past: a window that has already closed helps nobody.
                minimumDate={picker === 'start-date' ? new Date() : undefined}
                onChange={(_, chosen) => applyPicked(chosen)}
              />
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

/** The next whole hour a given number of hours out, so the defaults read tidily. */
function roundToNextHour(hoursFromNow: number): Date {
  const d = new Date(Date.now() + hoursFromNow * 3600_000);
  d.setMinutes(0, 0, 0);
  return d;
}

function withTimeFrom(day: Date, time: Date): Date {
  const d = new Date(day);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

function withDateFrom(day: Date, time: Date): Date {
  const d = new Date(day);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  card: { marginBottom: 14 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  hint: { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
  },
  rowValue: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  timeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  timeCell: { flex: 1 },
  toLabel:  { fontSize: 16, color: Colors.textSecondary },

  dogRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  dogAvatar: { width: 40, height: 40, borderRadius: 20 },
  dogPlaceholder: { backgroundColor: 'rgba(46,158,107,0.12)', alignItems: 'center', justifyContent: 'center' },
  dogName: { flex: 1, fontSize: 15, color: Colors.textSecondary },
  dogNamePicked: { color: Colors.text, fontWeight: '700' },

  noteInput: {
    minHeight: 84, textAlignVertical: 'top',
    fontSize: 15, color: Colors.text,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalDone:    { fontSize: 16, color: Colors.primary, fontWeight: '700' },

  error: { color: Colors.error, fontSize: 13, marginBottom: 10, textAlign: 'center' },
  submit: { marginTop: 2 },
  submitText: { color: Colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
