import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { dogService, Dog } from '../../services/dogService';
import { sosService } from '../../services/sosService';
import { usePlaceName } from '../../hooks/usePlaceName';
import { getApiError } from '../../utils/apiError';
import { KEYBOARD_BEHAVIOR } from '../../utils/keyboardBehavior';

type Props = NativeStackScreenProps<RootStackParamList, 'RaiseSos'>;

type Point = { latitude: number; longitude: number; name?: string };

/**
 * Raising a lost-dog alert.
 *
 * <p>The last-seen point is asked for rather than taken from the profile: the
 * profile location is usually home, and the dog is usually not there. It is
 * shared with everyone within 100 km, which the confirmation says out loud.
 */
export default function RaiseSosScreen({ navigation, route }: Readonly<Props>) {
  const { t } = useTranslation();
  const [dogs, setDogs] = useState<Dog[] | null>(null);
  const [dogId, setDogId] = useState<number | null>(route.params?.dogId ?? null);
  const [point, setPoint] = useState<Point | null>(null);
  const [note, setNote] = useState('');
  const [locating, setLocating] = useState(false);
  const [sending, setSending] = useState(false);
  const resolvedName = usePlaceName(point?.latitude, point?.longitude);
  const placeName = point?.name ?? resolvedName;

  useEffect(() => {
    dogService.getMyDogs()
      .then(list => {
        setDogs(list);
        if (list.length === 1) setDogId(list[0].id);
      })
      .catch(() => setDogs([]));
  }, []);

  // ParkPicker returns its selection by popping back with merged params
  useEffect(() => {
    const picked = route.params?.pickedPlace;
    if (picked) setPoint({ latitude: picked.latitude, longitude: picked.longitude, name: picked.name });
  }, [route.params?.pickedPlace]);

  const useHere = async () => {
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

  const dog = dogs?.find(d => d.id === dogId) ?? null;

  const send = () => {
    if (!dog) { Alert.alert(t('common.error'), t('sos.raise.pickDog')); return; }
    if (!point) { Alert.alert(t('common.error'), t('sos.raise.pickPlace')); return; }
    Alert.alert(
      t('sos.raise.confirmTitle', { name: dog.name }),
      t('sos.raise.confirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('sos.raise.confirmSend'),
          style: 'destructive',
          onPress: async () => {
            setSending(true);
            try {
              const alert = await sosService.raise({
                dogId: dog.id,
                latitude: point.latitude,
                longitude: point.longitude,
                placeName: placeName ?? undefined,
                note: note.trim() || undefined,
              });
              // popTo past a ParkPicker that may be sitting underneath, then open the alert
              navigation.popTo('MainTabs');
              navigation.navigate('SosDetail', { alertId: alert.id });
            } catch (e) {
              Alert.alert(t('common.error'), getApiError(e));
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('sos.raise.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={KEYBOARD_BEHAVIOR}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <GlassCard style={styles.card}>
            <View style={styles.introRow}>
              <Text style={styles.introEmoji}>🚨</Text>
              <Text style={styles.introText}>{t('sos.raise.intro')}</Text>
            </View>
          </GlassCard>

          {/* WHICH DOG */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('sos.raise.dogLabel')}</Text>
            {dogs === null ? (
              <ActivityIndicator color={Colors.primary} />
            ) : dogs.length === 0 ? (
              <Text style={styles.hint}>{t('sos.raise.noDogs')}</Text>
            ) : (
              <View style={styles.dogRow}>
                {dogs.map(d => {
                  const selected = d.id === dogId;
                  const photo = d.photos[0]?.thumbUrl ?? d.profilePicture;
                  return (
                    <TouchableOpacity key={d.id} style={[styles.dogChip, selected && styles.dogChipActive]} onPress={() => setDogId(d.id)}>
                      {photo
                        ? <RemoteImage source={{ uri: photo }} style={styles.dogThumb} />
                        : <Text style={styles.dogEmoji}>🐶</Text>}
                      <Text style={[styles.dogName, selected && styles.dogNameActive]}>{d.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </GlassCard>

          {/* LAST SEEN */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('sos.raise.whereLabel')}</Text>
            {point && (
              <View style={styles.placeRow}>
                <Ionicons name="location" size={18} color={Colors.error} />
                <Text style={styles.placeText} numberOfLines={2}>
                  {placeName ?? `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`}
                </Text>
              </View>
            )}
            <View style={styles.placeButtons}>
              <TouchableOpacity style={styles.placeButton} onPress={useHere} disabled={locating}>
                {locating
                  ? <ActivityIndicator size="small" color={Colors.primary} />
                  : <Ionicons name="navigate-outline" size={17} color={Colors.primary} />}
                <Text style={styles.placeButtonText}>{t('sos.raise.useHere')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.placeButton}
                onPress={() => navigation.navigate('ParkPicker', {
                  returnTo: 'RaiseSos',
                  ...(point ? { initialLat: point.latitude, initialLng: point.longitude } : {}),
                })}
              >
                <Ionicons name="map-outline" size={17} color={Colors.primary} />
                <Text style={styles.placeButtonText}>{t('sos.raise.pickOnMap')}</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>{t('sos.raise.whereHint')}</Text>
          </GlassCard>

          {/* NOTE */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>{t('sos.raise.noteLabel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('sos.raise.notePlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              value={note}
              onChangeText={v => setNote(v.slice(0, 1000))}
              multiline
              textAlignVertical="top"
            />
          </GlassCard>

          <TouchableOpacity
            style={[styles.sendButton, (sending || !dog || !point) && styles.sendButtonDisabled]}
            onPress={send}
            disabled={sending}
          >
            {sending
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.sendText}>{t('sos.raise.send')}</Text>}
          </TouchableOpacity>
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
    paddingHorizontal: 16, paddingVertical: 10,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  scroll: { paddingHorizontal: 16, paddingTop: 4 },
  card: { marginBottom: 14 },

  introRow:   { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  introEmoji: { fontSize: 26 },
  introText:  { flex: 1, fontSize: 14, color: Colors.text, lineHeight: 20 },

  sectionLabel: {
    fontSize: 12, fontWeight: '800', color: Colors.textSecondary,
    letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 10,
  },
  hint: { fontSize: 12, color: Colors.textSecondary, marginTop: 8, lineHeight: 17 },

  dogRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dogChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, paddingLeft: 6, paddingRight: 14, borderRadius: 22,
    borderWidth: 1.5, borderColor: Colors.glass.inputBorder, backgroundColor: Colors.glass.inputBg,
  },
  dogChipActive:  { borderColor: Colors.error },
  dogThumb:       { width: 30, height: 30, borderRadius: 15 },
  dogEmoji:       { fontSize: 20, width: 30, textAlign: 'center' },
  dogName:        { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  dogNameActive:  { color: Colors.text, fontWeight: '800' },

  placeRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  placeText: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  placeButtons: { flexDirection: 'row', gap: 8 },
  placeButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.glass.inputBorder, backgroundColor: Colors.glass.inputBg,
  },
  placeButtonText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  input: {
    minHeight: 90, fontSize: 15, color: Colors.text,
    backgroundColor: Colors.glass.inputBg, borderWidth: 1, borderColor: Colors.glass.inputBorder,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },

  sendButton: {
    backgroundColor: Colors.error, borderRadius: 18, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
