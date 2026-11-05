import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { RemoteImage } from '../../components/ui/RemoteImage';
import { schoolService } from '../../services/schoolService';
import { PlaceResult } from '../../services/playdateService';
import { containsProfanity } from '../../utils/profanityFilter';
import { getApiError } from '../../utils/apiError';
import { KEYBOARD_BEHAVIOR } from '../../utils/keyboardBehavior';

type Props = NativeStackScreenProps<RootStackParamList, 'EditSchool'>;

/** Registering a dog school, or editing your own. A new one waits for review. */
export default function EditSchoolScreen({ navigation, route }: Readonly<Props>) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [place, setPlace] = useState<PlaceResult | null>(null);
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [openingHours, setOpeningHours] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [newLogo, setNewLogo] = useState<string | null>(null);

  useEffect(() => {
    schoolService.mine().then(s => {
      if (!s) return;
      setExisting(true);
      setName(s.name);
      setDescription(s.description ?? '');
      setPlace({ name: s.name, address: s.address, latitude: s.latitude, longitude: s.longitude });
      setPhone(s.phone ?? '');
      setWebsite(s.website ?? '');
      setOpeningHours(s.openingHours ?? '');
      setLogo(s.logo);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Back from the map picker with the school's address.
  useEffect(() => {
    if (route.params?.pickedPlace) setPlace(route.params.pickedPlace);
  }, [route.params?.pickedPlace]);

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!result.canceled && result.assets[0]) setNewLogo(result.assets[0].uri);
  };

  const save = async () => {
    if (!name.trim()) { setError(t('school.form.nameRequired')); return; }
    if (!place) { setError(t('school.form.addressRequired')); return; }
    if ([name, description, openingHours].some(containsProfanity)) { setError(t('market.edit.profanity')); return; }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        address: place.address ?? place.name,
        latitude: place.latitude,
        longitude: place.longitude,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        openingHours: openingHours.trim() || undefined,
      };
      const saved = existing ? await schoolService.update(payload) : await schoolService.register(payload);
      if (newLogo) await schoolService.setLogo(newLogo);
      if (existing) navigation.goBack();
      else navigation.replace('SchoolDetail', { schoolId: saved.id });
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const field = (value: string, set: (v: string) => void, placeholder: string, extra: object = {}) => (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={set}
      placeholder={placeholder}
      placeholderTextColor={Colors.textSecondary}
      {...extra}
    />
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(existing ? 'school.form.editTitle' : 'school.form.newTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} /> : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={KEYBOARD_BEHAVIOR}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {!existing && (
              <GlassCard style={styles.card}>
                <Text style={styles.text}>{t('school.form.reviewNote')}</Text>
              </GlassCard>
            )}

            <TouchableOpacity style={styles.logoWrap} onPress={pickLogo} testID="school-logo">
              {newLogo || logo
                ? <RemoteImage source={{ uri: (newLogo ?? logo)! }} style={styles.logo} />
                : <View style={[styles.logo, styles.noLogo]}><Ionicons name="camera-outline" size={28} color={Colors.primary} /></View>}
              <Text style={styles.logoText}>{t('school.form.logo')}</Text>
            </TouchableOpacity>

            {field(name, setName, t('school.form.name'), { maxLength: 100, testID: 'school-name' })}

            <TouchableOpacity
              style={styles.input}
              onPress={() => navigation.navigate('ParkPicker', {
                returnTo: 'EditSchool', initialLat: place?.latitude, initialLng: place?.longitude,
              })}
              testID="school-address"
            >
              <Text style={place ? styles.value : styles.placeholder} numberOfLines={2}>
                {place ? (place.address ?? place.name) : t('school.form.address')}
              </Text>
            </TouchableOpacity>

            {field(phone, setPhone, t('school.form.phone'), { keyboardType: 'phone-pad', maxLength: 40 })}
            {field(website, setWebsite, t('school.form.website'), { autoCapitalize: 'none', keyboardType: 'url', maxLength: 200 })}
            {field(openingHours, setOpeningHours, t('school.form.openingHours'), { multiline: true, maxLength: 1000, style: [styles.input, styles.multiline] })}
            {field(description, setDescription, t('school.form.about'), { multiline: true, maxLength: 1500, style: [styles.input, styles.multiline] })}

            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} testID="school-save">
              {saving ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.saveText}>{t(existing ? 'school.form.save' : 'school.form.submit')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  card:   { marginBottom: 14 },
  text:   { fontSize: 14, color: Colors.text, lineHeight: 20 },
  logoWrap: { alignItems: 'center', marginBottom: 16 },
  logo:   { width: 96, height: 96, borderRadius: 22 },
  noLogo: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.primary },
  logoText: { fontSize: 13, color: Colors.primary, fontWeight: '600', marginTop: 6 },
  input: {
    backgroundColor: Colors.glass.inputBg, borderWidth: 1, borderColor: Colors.glass.inputBorder,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, marginBottom: 12,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  value:  { fontSize: 15, color: Colors.text },
  placeholder: { fontSize: 15, color: Colors.textSecondary },
  error:  { color: Colors.error, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
