import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
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
import { LISTING_CATEGORIES, ListingCategory, ListingPhoto, marketService } from '../../services/marketService';
import { containsProfanity } from '../../utils/profanityFilter';
import { getApiError } from '../../utils/apiError';
import { KEYBOARD_BEHAVIOR } from '../../utils/keyboardBehavior';

type Props = NativeStackScreenProps<RootStackParamList, 'EditListing'>;

const MAX_PHOTOS = 5;

/** A photo already on the server, or one picked here and not uploaded yet. */
type Photo = { kind: 'existing'; photo: ListingPhoto } | { kind: 'new'; uri: string };

/** "12.50" or "12,50" → 1250 Rappen; null when it is not a price. */
export function parsePrice(text: string): number | null {
  const normalized = text.trim().replace(',', '.').replace(/^CHF\s*/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(parseFloat(normalized) * 100);
}

export default function EditListingScreen({ navigation, route }: Readonly<Props>) {
  const { t } = useTranslation();
  const listingId = route.params?.listingId;
  const [loading, setLoading] = useState(!!listingId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [free, setFree] = useState(false);
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<ListingCategory | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [removed, setRemoved] = useState<number[]>([]);

  useEffect(() => {
    if (!listingId) return;
    marketService.get(listingId).then(l => {
      setTitle(l.title);
      setDescription(l.description ?? '');
      setFree(l.priceRappen == null);
      setPrice(l.priceRappen == null ? '' : String(l.priceRappen / 100));
      setCategory(l.category);
      setPhotos(l.photos.map(photo => ({ kind: 'existing', photo })));
    }).catch(e => setError(getApiError(e))).finally(() => setLoading(false));
  }, [listingId]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!result.canceled && result.assets[0]) {
      const added: Photo = { kind: 'new', uri: result.assets[0].uri };
      setPhotos(prev => [...prev, added].slice(0, MAX_PHOTOS));
    }
  };

  const removePhoto = (index: number) => {
    const p = photos[index];
    if (p.kind === 'existing') setRemoved(prev => [...prev, p.photo.id]);
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const save = async () => {
    const priceRappen = free ? null : parsePrice(price);
    if (!title.trim()) { setError(t('market.edit.titleRequired')); return; }
    if (!category) { setError(t('market.edit.categoryRequired')); return; }
    if (!free && priceRappen == null) { setError(t('market.edit.priceInvalid')); return; }
    if (photos.length === 0) { setError(t('market.edit.photoRequired')); return; }
    if (containsProfanity(title) || containsProfanity(description)) { setError(t('market.edit.profanity')); return; }
    setError(null);
    setSaving(true);
    try {
      const payload = { title: title.trim(), description: description.trim() || undefined, priceRappen, category };
      const saved = listingId ? await marketService.update(listingId, payload) : await marketService.create(payload);
      for (const id of removed) await marketService.deletePhoto(saved.id, id);
      for (const p of photos) if (p.kind === 'new') await marketService.addPhoto(saved.id, p.uri);
      if (listingId) navigation.goBack();
      else navigation.replace('ListingDetail', { listingId: saved.id });
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
        <Text style={styles.headerTitle}>{t(listingId ? 'market.edit.editTitle' : 'market.edit.newTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} /> : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={KEYBOARD_BEHAVIOR}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* The rules first: cheaper to read now than to be reported later. */}
            <GlassCard style={styles.card}>
              <Text style={styles.rulesTitle}>{t('market.edit.rulesTitle')}</Text>
              <Text style={styles.rulesText}>{t('market.edit.rules')}</Text>
            </GlassCard>

            <View style={styles.photoRow}>
              {photos.map((p, i) => (
                <View key={p.kind === 'existing' ? `e${p.photo.id}` : `n${p.uri}`} style={styles.photoWrap}>
                  <RemoteImage source={{ uri: p.kind === 'existing' ? p.photo.thumbUrl : p.uri }} style={styles.photo} />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity style={[styles.photo, styles.addPhoto]} onPress={pickPhoto} testID="listing-add-photo">
                  <Ionicons name="camera-outline" size={26} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>

            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder={t('market.edit.titlePlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              maxLength={80}
              testID="listing-title"
            />
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('market.edit.descriptionPlaceholder')}
              placeholderTextColor={Colors.textSecondary}
              maxLength={1000}
              multiline
            />

            <Text style={styles.label}>{t('market.edit.category')}</Text>
            <View style={styles.chips}>
              {LISTING_CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, category === c && styles.chipActive]}
                  onPress={() => setCategory(c)}
                  testID={`listing-category-${c}`}
                >
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{t(`market.category.${c}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.freeRow}>
              <Text style={styles.freeLabel}>{t('market.edit.giveAway')}</Text>
              <Switch value={free} onValueChange={setFree} trackColor={{ true: Colors.primary }} testID="listing-free" />
            </View>
            {!free && (
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder={t('market.edit.pricePlaceholder')}
                placeholderTextColor={Colors.textSecondary}
                keyboardType="decimal-pad"
                testID="listing-price"
              />
            )}

            {error && <Text style={styles.error}>{error}</Text>}
            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving} testID="listing-save">
              {saving ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.saveText}>{t(listingId ? 'market.edit.save' : 'market.edit.publish')}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  scroll:      { paddingHorizontal: 20, paddingBottom: 40 },
  card:        { marginBottom: 14 },
  rulesTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  rulesText:   { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  photoRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  photoWrap:   { position: 'relative' },
  photo:       { width: 84, height: 84, borderRadius: 12 },
  addPhoto:    { borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  photoRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: Colors.background, borderRadius: 11 },

  input: {
    backgroundColor: Colors.glass.inputBg, borderWidth: 1, borderColor: Colors.glass.inputBorder,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text, marginBottom: 12,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  label:     { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 8, marginTop: 4 },
  chips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.glass.inputBg,
  },
  chipActive:     { borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  chipText:       { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
  freeRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  freeLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  error:     { color: Colors.error, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  saveBtn:   { backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  saveText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});
