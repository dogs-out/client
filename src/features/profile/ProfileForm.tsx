import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { userService, UserPhoto } from '../../services/userService';
import { OWNER_LIFESTYLE_TAGS, OWNER_PERSONALITY_TAGS, RELATIONSHIP_STATUS_OPTIONS } from '../../constants/tags';
import { translateTag } from '../../i18n/translateTag';
import { getApiError } from '../../utils/apiError';
import { containsProfanity } from '../../utils/profanityFilter';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassButton } from '../../components/GlassButton';
import { Colors } from '../../constants/colors';

interface Props {
  title: string;
  subtitle: string;
  submitLabel: string;
  onBack?: () => void;
  onSaved: () => void;
}

const MIN_AGE = 18;
const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'\-]+$/;
// Without an explicit minimum the Android picker bottoms out at the Unix epoch (1970)
const MIN_DOB = new Date(1900, 0, 1);

function isOldEnough(date: Date): boolean {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE);
  return date <= cutoff;
}

const defaultPickerDate = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 25);
  return d;
})();

type PhotoItem =
  | { kind: 'existing'; photoId: number; uri: string }
  | { kind: 'new'; uri: string };

export function ProfileForm({ title, subtitle, submitLabel, onBack, onSaved }: Props) {
  const { t } = useTranslation();
  const [name, setName]                     = useState('');
  const [bio, setBio]                       = useState('');
  const [dateOfBirth, setDateOfBirth]       = useState<Date | null>(null);
  const [showPicker, setShowPicker]         = useState(false);
  const [photos, setPhotos]                 = useState<PhotoItem[]>([]);
  const [location, setLocation]             = useState<{ latitude: number; longitude: number } | null>(null);
  const [lifestyleTags, setLifestyleTags]   = useState<string[]>([]);
  const [personalityTags, setPersonalityTags] = useState<string[]>([]);
  const [relationshipStatus, setRelationshipStatus] = useState<string | null>(null);
  const [locating, setLocating]             = useState(false);
  const [loading, setLoading]               = useState(false);
  const [fetching, setFetching]             = useState(true);
  const [error, setError]                   = useState<string | null>(null);
  const originalPhotoIds = useRef<number[]>([]);

  useEffect(() => {
    userService.getMe().then(user => {
      if (user.name) setName(user.name);
      if (user.bio) setBio(user.bio);
      if (user.dateOfBirth) setDateOfBirth(new Date(user.dateOfBirth));
      if (user.latitude && user.longitude) {
        setLocation({ latitude: user.latitude, longitude: user.longitude });
      }
      if (user.lifestyleTags?.length) setLifestyleTags(user.lifestyleTags);
      if (user.personalityTags?.length) setPersonalityTags(user.personalityTags);
      if (user.relationshipStatus) setRelationshipStatus(user.relationshipStatus);
      if (user.photos?.length) {
        const loaded = user.photos.map(p => ({ kind: 'existing' as const, photoId: p.id, uri: p.imageData }));
        setPhotos(loaded);
        originalPhotoIds.current = user.photos.map(p => p.id);
      }
    }).catch(() => {}).finally(() => setFetching(false));
  }, []);

  const addPhoto = async () => {
    if (photos.length >= 3) { setError(t('profile.form.maxPhotos')); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError(t('profile.form.photoPermission')); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setPhotos(prev => [...prev, { kind: 'new', uri: `data:image/jpeg;base64,${result.assets[0].base64}` }]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // The first photo is always the main one — "make main" just moves it to the front
  const makeMainPhoto = (index: number) => {
    setPhotos(prev => [prev[index], ...prev.filter((_, i) => i !== index)]);
  };

  const detectLocation = async () => {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError(t('profile.form.locationPermission'));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      setError(t('profile.form.locationError'));
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError(t('profile.form.nameRequired')); return; }
    if (!NAME_REGEX.test(name.trim())) { setError(t('auth.register.invalidName')); return; }
    if (containsProfanity(name)) { setError(t('profile.form.nameProfanity')); return; }
    if (!dateOfBirth) { setError(t('profile.form.dobRequired')); return; }
    if (!isOldEnough(dateOfBirth)) { setError(t('profile.form.tooYoung')); return; }
    if (!location) { setError(t('profile.form.locationRequired')); return; }
    if (bio && containsProfanity(bio)) { setError(t('profile.form.bioProfanity')); return; }
    setLoading(true);
    setError(null);
    try {
      const currentExistingIds = photos
        .filter((p): p is { kind: 'existing'; photoId: number; uri: string } => p.kind === 'existing')
        .map(p => p.photoId);
      const deletedIds = originalPhotoIds.current.filter(id => !currentExistingIds.includes(id));
      await Promise.all(deletedIds.map(id => userService.deletePhoto(id)));
      // Upload new photos sequentially and collect ids in display order, then
      // persist that order — the first photo becomes the profile picture.
      const orderedIds: number[] = [];
      for (const p of photos) {
        if (p.kind === 'existing') {
          orderedIds.push(p.photoId);
        } else {
          const saved = await userService.addPhoto(p.uri);
          orderedIds.push(saved.id);
        }
      }
      if (orderedIds.length > 0) {
        await userService.reorderPhotos(orderedIds);
      }
      await userService.updateProfile({
        name: name.trim(),
        bio: bio.trim() || undefined,
        dateOfBirth: dateOfBirth.toISOString().split('T')[0],
        latitude: location?.latitude,
        longitude: location?.longitude,
        lifestyleTags: lifestyleTags.length ? lifestyleTags : undefined,
        personalityTags: personalityTags.length ? personalityTags : undefined,
        relationshipStatus: relationshipStatus ?? undefined,
      });
      onSaved();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const MAX_TAGS_PER_CATEGORY = 2;

  const toggleTag = (setter: React.Dispatch<React.SetStateAction<string[]>>, tag: string) => {
    setter(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length >= MAX_TAGS_PER_CATEGORY ? prev : [...prev, tag]
    );
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  if (fetching) {
    return (
      <View style={styles.centered}>
        <FloatingBackground />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FloatingBackground />
      <View style={styles.dimOverlay} />
      <KeyboardAvoidingView style={styles.kav} behavior="padding">
        <ScrollView
          style={styles.kav}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <Ionicons name="chevron-back" size={28} color={Colors.primary} />
            </TouchableOpacity>
          )}

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <Text style={styles.label}>{t('profile.form.photosLabel')} <Text style={styles.optional}>({photos.length}/3)</Text></Text>
          <View style={styles.photoGrid}>
            {Array.from({ length: 3 }).map((_, i) => {
              const photo = photos[i];
              return (
                <View key={i} style={styles.photoSlot}>
                  {photo ? (
                    <>
                      <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                      {i === 0 && <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>{t('dogs.form.mainBadge')}</Text></View>}
                      {i > 0 && (
                        <TouchableOpacity
                          style={styles.makeMainBtn}
                          onPress={() => makeMainPhoto(i)}
                          testID={`make-main-${i}`}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <Ionicons name="star" size={14} color="#fff" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                        <Ionicons name="close-circle" size={22} color="#e53e3e" />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <TouchableOpacity style={styles.photoAdd} onPress={addPhoto}>
                      <Ionicons name="add" size={28} color={Colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Text style={styles.label}>{t('profile.form.name')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('profile.form.namePlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />

          <Text style={styles.label}>{t('profile.form.bio')} <Text style={styles.optional}>{t('profile.form.optional')}</Text></Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder={t('profile.form.bioPlaceholder')}
            placeholderTextColor={Colors.textSecondary}
            value={bio}
            onChangeText={t => setBio(t.slice(0, 250))}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={250}
          />
          <Text style={[styles.charCount, bio.length > 230 && styles.charCountWarn]}>
            {bio.length}/250
          </Text>

          <Text style={styles.label}>{t('profile.form.dob')}</Text>
          {Platform.OS === 'web' ? (
            <View style={styles.input}>
              {/* @ts-ignore — native HTML date input for web testing */}
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                value={dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  if (e.target.value) setDateOfBirth(new Date(e.target.value + 'T12:00:00'));
                }}
                style={{ border: 'none', background: 'transparent', fontSize: 16, color: Colors.text, width: '100%', outline: 'none', padding: 0 }}
              />
            </View>
          ) : (
            <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
              <Text style={dateOfBirth ? styles.dateText : styles.datePlaceholder}>
                {dateOfBirth ? formatDate(dateOfBirth) : t('profile.form.selectDob')}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>{t('profile.form.location')}</Text>
          <GlassButton onPress={detectLocation} disabled={locating} style={styles.locationButton}>
            {locating ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons
                  name={location ? 'location' : 'location-outline'}
                  size={18}
                  color={location ? '#48bb78' : Colors.text}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.locationButtonText, location && styles.locationButtonTextActive]}>
                  {location ? t('profile.form.locationDetected') : t('profile.form.detectLocation')}
                </Text>
              </>
            )}
          </GlassButton>

          {/* OWNER TAGS */}
          <Text style={[styles.label, { marginTop: 8 }]}>
            {t('profile.form.tags')} <Text style={styles.optional}>{t('profile.form.optional')}</Text>
          </Text>

          <Text style={styles.tagCat}>{t('profile.form.lifestyle')}</Text>
          <View style={styles.chipRow}>
            {OWNER_LIFESTYLE_TAGS.map(tag => {
              const sel = lifestyleTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.chip, sel && styles.chipActive]}
                  onPress={() => toggleTag(setLifestyleTags, tag)}
                >
                  <Text style={[styles.chipText, sel && styles.chipTextActive]}>{translateTag(tag, t)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.tagCat}>{t('profile.form.personality')}</Text>
          <View style={styles.chipRow}>
            {OWNER_PERSONALITY_TAGS.map(tag => {
              const sel = personalityTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.chip, sel && styles.chipActive]}
                  onPress={() => toggleTag(setPersonalityTags, tag)}
                >
                  <Text style={[styles.chipText, sel && styles.chipTextActive]}>{translateTag(tag, t)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.tagCat}>{t('profile.form.relationshipStatus')}</Text>
          <View style={styles.chipRow}>
            {RELATIONSHIP_STATUS_OPTIONS.map(opt => {
              const sel = relationshipStatus === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.chip, sel && styles.chipActive]}
                  onPress={() => setRelationshipStatus(sel ? null : opt)}
                >
                  <Text style={[styles.chipText, sel && styles.chipTextActive]}>{translateTag(opt, t)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {error && <Text style={styles.error} testID="form-error-bottom">{error}</Text>}

          {loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={Colors.primary} />
          ) : (
            <GlassButton onPress={handleSubmit} style={styles.button}>
              <Text style={styles.buttonText}>{submitLabel}</Text>
            </GlassButton>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalCancel}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  if (!dateOfBirth) setDateOfBirth(defaultPickerDate);
                  setShowPicker(false);
                }}>
                  <Text style={styles.modalDone}>{t('common.done')}</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateOfBirth ?? defaultPickerDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                minimumDate={MIN_DOB}
                onChange={(_, date) => { if (date) setDateOfBirth(date); }}
              />
            </View>
          </View>
        </Modal>
      )}

      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={dateOfBirth ?? defaultPickerDate}
          mode="date"
          maximumDate={new Date()}
          minimumDate={MIN_DOB}
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) setDateOfBirth(date);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1, backgroundColor: Colors.background },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  dimOverlay:   { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(238,251,243,0.60)', pointerEvents: 'none' },
  kav:          { flex: 1 },
  container:    { padding: 24, paddingTop: 56, paddingBottom: 40 },

  backButton:   { marginBottom: 8 },
  title:        { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  subtitle:     { fontSize: 16, color: Colors.textSecondary, marginBottom: 32 },

  photoGrid:   { flexDirection: 'row', gap: 10, marginBottom: 24 },
  photoSlot:   { flex: 1, aspectRatio: 1, borderRadius: 12, overflow: 'hidden' },
  photoThumb:  { width: '100%', height: '100%' },
  photoAdd:    {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    borderRadius: 12, backgroundColor: 'rgba(46,158,107,0.04)',
  },
  photoRemove: { position: 'absolute', top: 4, right: 4 },
  makeMainBtn: {
    position: 'absolute', bottom: 4, left: 4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(13,40,24,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  mainBadge:   { position: 'absolute', bottom: 4, left: 4, backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  mainBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  error:        { color: Colors.error, marginBottom: 12, textAlign: 'center' },
  label:        { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  optional:     { fontWeight: '400', color: Colors.textSecondary },
  input:        {
    borderWidth: 1.5, borderColor: Colors.glass.inputBorder, borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 20, color: Colors.text,
    backgroundColor: Colors.glass.inputBg, justifyContent: 'center',
  },
  bioInput:     { height: 90 },
  charCount:    { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: -16, marginBottom: 20 },
  charCountWarn:{ color: Colors.error },
  dateText:     { fontSize: 16, color: Colors.text },
  datePlaceholder: { fontSize: 16, color: Colors.textSecondary },

  locationButton:          { marginBottom: 32 },
  locationButtonText:      { color: Colors.text, fontSize: 16, fontWeight: '600' },
  locationButtonTextActive: { color: '#48bb78' },

  button:     { marginTop: 4 },
  buttonText: { color: Colors.text, fontSize: 16, fontWeight: '700' },

  modalOverlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26,10,0,0.35)' },
  modalContent:  { backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader:   {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalCancel:   { fontSize: 16, color: Colors.textSecondary },
  modalDone:     { fontSize: 16, color: Colors.primary, fontWeight: '700' },

  tagCat:       { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 12, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.glass.inputBg },
  chipActive:   { borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  chipText:     { fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },
});
