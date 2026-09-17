import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { KEYBOARD_BEHAVIOR } from '../../utils/keyboardBehavior';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { sitterService } from '../../services/sitterService';
import { getApiError } from '../../utils/apiError';

type Props = NativeStackScreenProps<RootStackParamList, 'SittingDetails'>;

interface Point { latitude: number; longitude: number; name?: string | null }

/**
 * What the sitter needs to actually do the job.
 *
 * <p>Asked for only once somebody has been accepted. Most requests are never
 * taken, and nobody types their address and their vet's number into a form on
 * the chance that one might be — so this is a second, later step rather than
 * three more fields on the posting screen.
 *
 * <p>Saving posts it into the chat as a card. The sitter will look for this in
 * the conversation when they are standing outside the door, not behind a screen
 * they would have to remember exists.
 */
export default function SittingDetailsScreen({ navigation, route }: Readonly<Props>) {
  const { t } = useTranslation();
  const { job, pickedPlace } = route.params;

  const [todo, setTodo] = useState(job.todoList ?? '');
  const [phone, setPhone] = useState(job.emergencyPhone ?? '');
  const [point, setPoint] = useState<Point | null>(
    job.addressLatitude != null && job.addressLongitude != null
      ? { latitude: job.addressLatitude, longitude: job.addressLongitude, name: job.addressLabel }
      : null);
  const [label, setLabel] = useState(job.addressLabel ?? '');
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A pin chosen on the map comes back through the route rather than a callback.
  useEffect(() => {
    if (!pickedPlace) return;
    setPoint({
      latitude: pickedPlace.latitude,
      longitude: pickedPlace.longitude,
      name: pickedPlace.name,
    });
    if (pickedPlace.name) setLabel(pickedPlace.name);
  }, [pickedPlace]);

  const useCurrentLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
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
    setError(null);
    try {
      await sitterService.shareDetails(job.id, {
        todoList: todo.trim() || undefined,
        emergencyPhone: phone.trim() || undefined,
        addressLabel: label.trim() || undefined,
        addressLatitude: point?.latitude,
        addressLongitude: point?.longitude,
      });
      navigation.goBack();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('sitter.details.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={KEYBOARD_BEHAVIOR}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            {t('sitter.details.intro', { name: job.sitterName ?? '' })}
          </Text>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('sitter.details.todoLabel')}</Text>
            <Text style={styles.hint}>{t('sitter.details.todoHint')}</Text>
            <TextInput
              style={styles.todoInput}
              placeholder={t('sitter.details.todoPlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              value={todo}
              onChangeText={setTodo}
              multiline
              maxLength={2000}
            />
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('sitter.details.phoneLabel')}</Text>
            <Text style={styles.hint}>{t('sitter.details.phoneHint')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('sitter.details.phonePlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={40}
            />
          </GlassCard>

          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('sitter.details.addressLabel')}</Text>
            <Text style={styles.hint}>{t('sitter.details.addressHint')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('sitter.details.addressPlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              value={label}
              onChangeText={setLabel}
              maxLength={200}
            />

            <View style={styles.pickRow}>
              <TouchableOpacity style={styles.pickBtn} onPress={useCurrentLocation} disabled={locating}>
                {locating
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Ionicons name="locate-outline" size={16} color={Colors.primary} />}
                <Text style={styles.pickText} numberOfLines={2}>{t('sitter.details.useCurrent')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.pickBtn}
                onPress={() => navigation.navigate('ParkPicker', {
                  initialLat: point?.latitude,
                  initialLng: point?.longitude,
                  returnTo: 'SittingDetails',
                })}
              >
                <Ionicons name="map-outline" size={16} color={Colors.primary} />
                <Text style={styles.pickText} numberOfLines={2}>{t('sitter.details.pickOnMap')}</Text>
              </TouchableOpacity>
            </View>

            {point && (
              <View style={styles.pinned}>
                <Ionicons name="location" size={14} color={Colors.primary} />
                <Text style={styles.pinnedText} numberOfLines={1}>
                  {point.name ?? t('sitter.details.pinDropped')}
                </Text>
                <TouchableOpacity onPress={() => setPoint(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={17} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </GlassCard>

          {error && <Text style={styles.error}>{error}</Text>}

          <GlassButton onPress={save} disabled={saving} style={styles.submit}>
            {saving
              ? <ActivityIndicator color={Colors.text} />
              : <Text style={styles.submitText}>
                  {t(job.detailsShared ? 'sitter.details.update' : 'sitter.details.send')}
                </Text>}
          </GlassButton>
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  intro: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20, marginBottom: 14 },
  card: { marginBottom: 14 },

  sectionLabel: { fontSize: 13, fontWeight: '800', color: Colors.textSecondary },
  hint: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, marginBottom: 10, lineHeight: 17 },

  input: {
    fontSize: 15, color: Colors.text,
    borderBottomWidth: 1.5, borderBottomColor: Colors.border, paddingVertical: 8,
  },
  todoInput: {
    minHeight: 110, textAlignVertical: 'top',
    fontSize: 15, color: Colors.text, lineHeight: 22,
  },

  pickRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  pickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
  },
  pickText: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.text },

  pinned: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 12, backgroundColor: 'rgba(46,158,107,0.10)',
  },
  pinnedText: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.text },

  error: { color: Colors.error, fontSize: 14, marginBottom: 10, textAlign: 'center' },
  submit: { marginTop: 4 },
  submitText: { fontSize: 16, fontWeight: '800', color: Colors.text },
});
