import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { dogService, DogPhoto } from '../../services/dogService';
import { getApiError } from '../../utils/apiError';
import { containsProfanity } from '../../utils/profanityFilter';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { Colors } from '../../constants/colors';
import { BreedPickerModal } from './BreedPickerModal';
import {
  DOG_PERSONALITY_TAGS, DOG_PLAY_TAGS, DOG_SOCIAL_TAGS,
  LOVES_OPTIONS, OFF_LEASH_OPTIONS, SOCIAL_BEHAVIOR_OPTIONS,
} from '../../constants/tags';

interface Props {
  dogId?: number;
  fromOnboarding?: boolean;
  onSaved: () => void;
  onBack?: () => void;
  onDelete?: () => void;
}

type PhotoState =
  | { kind: 'existing'; photoId: number; uri: string }
  | { kind: 'new'; uri: string };

const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'\-]+$/;
const MAX_DOB = new Date();
const MIN_DOB = new Date();
MIN_DOB.setFullYear(MIN_DOB.getFullYear() - 25);
const DEFAULT_DOB = new Date();
DEFAULT_DOB.setFullYear(DEFAULT_DOB.getFullYear() - 3);

export function DogForm({ dogId, fromOnboarding, onSaved, onBack, onDelete }: Props) {
  const [name, setName]               = useState('');
  const [breed, setBreed]             = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [bio, setBio]                 = useState('');
  const [photos, setPhotos]           = useState<PhotoState[]>([]);
  const [removedIds, setRemovedIds]   = useState<number[]>([]);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [socialBehavior, setSocialBehavior] = useState<string | null>(null);
  const [loves, setLoves]             = useState<string[]>([]);
  const [offLeash, setOffLeash]       = useState<string | null>(null);
  const [kidsComfort, setKidsComfort] = useState<number | null>(null);
  const [dogTags, setDogTags]         = useState<string[]>([]);
  const [showBreedPicker, setShowBreedPicker] = useState(false);
  const [showDatePicker, setShowDatePicker]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [fetching, setFetching]       = useState(!!dogId);
  const [error, setError]             = useState<string | null>(null);

  useEffect(() => {
    if (!dogId) return;
    dogService.getDog(dogId).then(dog => {
      setName(dog.name);
      setBreed(dog.breed);
      if (dog.dateOfBirth) setDateOfBirth(new Date(dog.dateOfBirth));
      setBio(dog.bio ?? '');
      setPhotos(dog.photos.map(p => ({ kind: 'existing', photoId: p.id, uri: p.imageData })));
      setEnergyLevel(dog.energyLevel);
      setSocialBehavior(dog.socialBehavior);
      setLoves(dog.loves ?? []);
      setOffLeash(dog.offLeash);
      setKidsComfort(dog.kidsComfort);
      setDogTags(dog.tags ?? []);
    }).catch(() => setError('Failed to load dog profile.')).finally(() => setFetching(false));
  }, [dogId]);

  const pickPhoto = async () => {
    if (photos.length >= 6) { setError('Maximum 6 photos per dog.'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Photo library access is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.6, base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      const uri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotos(prev => [...prev, { kind: 'new', uri }]);
    }
  };

  const removePhoto = (index: number) => {
    const photo = photos[index];
    if (photo.kind === 'existing') {
      setRemovedIds(prev => [...prev, photo.photoId]);
    }
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleLove = (item: string) => {
    setLoves(prev =>
      prev.includes(item) ? prev.filter(l => l !== item) : prev.length < 3 ? [...prev, item] : prev
    );
  };

  const toggleTag = (tag: string) => {
    const category = DOG_PERSONALITY_TAGS.includes(tag) ? DOG_PERSONALITY_TAGS
      : DOG_PLAY_TAGS.includes(tag) ? DOG_PLAY_TAGS
      : DOG_SOCIAL_TAGS;
    setDogTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev.filter(t => !category.includes(t)), tag]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Your dog needs a name.'); return; }
    if (!NAME_REGEX.test(name.trim())) { setError('Name may only contain letters, spaces, hyphens, and apostrophes.'); return; }
    if (containsProfanity(name)) { setError('Your dog\'s name contains inappropriate language.'); return; }
    if (bio && containsProfanity(bio)) { setError('Your dog\'s bio contains inappropriate language.'); return; }
    setLoading(true);
    setError(null);
    try {
      const firstNewPhoto = photos.find(p => p.kind === 'new');
      const payload = {
        name: name.trim(),
        breed: breed ?? undefined,
        dateOfBirth: dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : undefined,
        bio: bio.trim() || undefined,
        profilePicture: firstNewPhoto?.uri ?? (photos[0]?.uri ?? undefined),
        energyLevel: energyLevel ?? undefined,
        socialBehavior: socialBehavior ?? undefined,
        loves: loves.length ? loves : undefined,
        offLeash: offLeash ?? undefined,
        kidsComfort: kidsComfort ?? undefined,
        tags: dogTags.length ? dogTags : undefined,
      };

      let savedDogId: number;
      if (dogId) {
        await dogService.updateDog(dogId, payload);
        savedDogId = dogId;
      } else {
        const created = await dogService.createDog(payload);
        savedDogId = created.id;
      }

      // Delete removed photos
      await Promise.all(removedIds.map(pid => dogService.deletePhoto(savedDogId, pid)));

      // Upload new photos
      const newPhotos = photos.filter(p => p.kind === 'new') as { kind: 'new'; uri: string }[];
      await Promise.all(newPhotos.map(p => dogService.addPhoto(savedDogId, p.uri)));

      onSaved();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!dogId) return;
    Alert.alert(
      'Remove dog',
      `Are you sure you want to remove ${name || 'this dog'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              await dogService.deleteDog(dogId);
              onDelete?.();
              onSaved();
            } catch (e) {
              setError(getApiError(e));
            }
          },
        },
      ]
    );
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  if (fetching) {
    return (
      <View style={styles.centered}>
        <FloatingBackground />
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FloatingBackground />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {(onBack || !fromOnboarding) && (
            <View style={styles.header}>
              {onBack && (
                <TouchableOpacity onPress={onBack}>
                  <Ionicons name="chevron-back" size={28} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.title}>
            {fromOnboarding ? 'Introduce your dog 🐾' : dogId ? 'Edit dog' : 'Add a dog'}
          </Text>
          <Text style={styles.subtitle}>
            {fromOnboarding ? 'Other dog owners will see this when you match' : 'Tell us about your furry friend'}
          </Text>

          {/* PHOTO GRID */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>Photos ({photos.length}/6)</Text>
            <Text style={styles.sectionHint}>Add up to 6 great shots of your dog</Text>
            <View style={styles.photoGrid}>
              {Array.from({ length: 6 }).map((_, i) => {
                const photo = photos[i];
                return (
                  <View key={i} style={styles.photoSlot}>
                    {photo ? (
                      <>
                        <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
                        <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                          <Ionicons name="close-circle" size={22} color="#e53e3e" />
                        </TouchableOpacity>
                        {i === 0 && <View style={styles.primaryBadge}><Text style={styles.primaryText}>Main</Text></View>}
                      </>
                    ) : (
                      <TouchableOpacity style={styles.photoAdd} onPress={pickPhoto}>
                        <Ionicons name="add" size={24} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          </GlassCard>

          {/* BASIC INFO */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>Basic Info</Text>
            {error && <Text style={styles.error}>{error}</Text>}

            <TextInput
              style={styles.input}
              placeholder="Name *"
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

            <TouchableOpacity style={styles.input} onPress={() => setShowBreedPicker(true)}>
              <Text style={breed ? styles.valueText : styles.placeholderText}>
                {breed ?? 'Breed (optional)'}
              </Text>
            </TouchableOpacity>

            {Platform.OS === 'web' ? (
              <View style={styles.input}>
                {/* @ts-ignore */}
                <input
                  type="date"
                  max={MAX_DOB.toISOString().split('T')[0]}
                  min={MIN_DOB.toISOString().split('T')[0]}
                  value={dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.target.value) setDateOfBirth(new Date(e.target.value + 'T12:00:00'));
                  }}
                  style={{ border: 'none', background: 'transparent', fontSize: 16, color: Colors.text, width: '100%', outline: 'none', padding: 0 }}
                />
              </View>
            ) : (
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <Text style={dateOfBirth ? styles.valueText : styles.placeholderText}>
                  {dateOfBirth ? formatDate(dateOfBirth) : 'Date of birth (optional)'}
                </Text>
              </TouchableOpacity>
            )}

            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Bio — what makes your dog special?"
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
          </GlassCard>

          {/* PERSONALITY */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>Personality</Text>

            <Text style={styles.questionLabel}>Energy level</Text>
            <Text style={styles.questionHint}>1 = Couch potato · 5 = Never stops running</Text>
            <View style={styles.levelRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setEnergyLevel(n)} style={styles.levelItem}>
                  <View style={[styles.levelDot, energyLevel === n && styles.levelDotActive]}>
                    <Text style={[styles.levelNum, energyLevel === n && styles.levelNumActive]}>{n}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.questionLabel, { marginTop: 20 }]}>How does your dog react to new dogs?</Text>
            <View style={styles.optionWrap}>
              {SOCIAL_BEHAVIOR_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionChip, socialBehavior === opt && styles.optionChipActive]}
                  onPress={() => setSocialBehavior(opt)}
                >
                  <Text style={[styles.optionText, socialBehavior === opt && styles.optionTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.questionLabel, { marginTop: 20 }]}>What does your dog love most? <Text style={styles.questionHint}>(up to 3)</Text></Text>
            <View style={styles.chipWrap}>
              {LOVES_OPTIONS.map(opt => {
                const sel = loves.includes(opt);
                const maxed = loves.length >= 3 && !sel;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.chip, sel && styles.chipActive, maxed && styles.chipDisabled]}
                    onPress={() => !maxed && toggleLove(opt)}
                  >
                    <Text style={[styles.chipText, sel && styles.chipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.questionLabel, { marginTop: 20 }]}>Off-leash comfort</Text>
            <View style={styles.optionWrap}>
              {OFF_LEASH_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.optionChip, offLeash === opt && styles.optionChipActive]}
                  onPress={() => setOffLeash(opt)}
                >
                  <Text style={[styles.optionText, offLeash === opt && styles.optionTextActive]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.questionLabel, { marginTop: 20 }]}>Comfort around small children</Text>
            <Text style={styles.questionHint}>1 = Avoids them · 5 = Loves them</Text>
            <View style={styles.levelRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity key={n} onPress={() => setKidsComfort(n)} style={styles.levelItem}>
                  <View style={[styles.levelDot, kidsComfort === n && styles.levelDotActive]}>
                    <Text style={[styles.levelNum, kidsComfort === n && styles.levelNumActive]}>{n}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {/* TAGS */}
          <GlassCard style={styles.card}>
            <Text style={styles.sectionLabel}>Tags</Text>
            <Text style={styles.sectionHint}>Pick one per category</Text>

            <Text style={styles.tagCategory}>Personality</Text>
            <View style={styles.chipWrap}>
              {DOG_PERSONALITY_TAGS.map(tag => (
                <TouchableOpacity key={tag} style={[styles.chip, dogTags.includes(tag) && styles.chipActive]} onPress={() => toggleTag(tag)}>
                  <Text style={[styles.chipText, dogTags.includes(tag) && styles.chipTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.tagCategory}>Play style</Text>
            <View style={styles.chipWrap}>
              {DOG_PLAY_TAGS.map(tag => (
                <TouchableOpacity key={tag} style={[styles.chip, dogTags.includes(tag) && styles.chipActive]} onPress={() => toggleTag(tag)}>
                  <Text style={[styles.chipText, dogTags.includes(tag) && styles.chipTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.tagCategory}>Social</Text>
            <View style={styles.chipWrap}>
              {DOG_SOCIAL_TAGS.map(tag => (
                <TouchableOpacity key={tag} style={[styles.chip, dogTags.includes(tag) && styles.chipActive]} onPress={() => toggleTag(tag)}>
                  <Text style={[styles.chipText, dogTags.includes(tag) && styles.chipTextActive]}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </GlassCard>

          {/* ACTIONS */}
          <GlassCard style={styles.card}>
            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <GlassButton onPress={handleSave}>
                  <Text style={styles.saveText}>
                    {fromOnboarding ? "Let's go 🐾" : dogId ? 'Save changes' : 'Add dog'}
                  </Text>
                </GlassButton>
                {dogId && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={16} color={Colors.error} style={{ marginRight: 6 }} />
                    <Text style={styles.deleteText}>Remove this dog</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </GlassCard>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <BreedPickerModal
        visible={showBreedPicker}
        value={breed}
        onChange={setBreed}
        onClose={() => setShowBreedPicker(false)}
      />

      {Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { if (!dateOfBirth) setDateOfBirth(DEFAULT_DOB); setShowDatePicker(false); }}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateOfBirth ?? DEFAULT_DOB}
                mode="date"
                display="spinner"
                maximumDate={MAX_DOB}
                minimumDate={MIN_DOB}
                onChange={(_, d) => { if (d) setDateOfBirth(d); }}
              />
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && showDatePicker && (
        <DateTimePicker
          value={dateOfBirth ?? DEFAULT_DOB}
          mode="date"
          maximumDate={MAX_DOB}
          minimumDate={MIN_DOB}
          onChange={(_, d) => { setShowDatePicker(false); if (d) setDateOfBirth(d); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: Colors.background },
  flex:     { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  scroll:   { padding: 20, paddingTop: 56, paddingBottom: 40 },
  header:   { flexDirection: 'row', marginBottom: 8 },
  title:    { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 20 },
  card:     { width: '100%', marginBottom: 16 },

  sectionLabel: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sectionHint:  { fontSize: 12, color: Colors.textSecondary, marginBottom: 16 },

  photoGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoSlot:  { width: '31%', aspectRatio: 3 / 4, borderRadius: 10, overflow: 'visible' },
  photoThumb: { width: '100%', height: '100%', borderRadius: 10 },
  photoAdd:   {
    width: '100%', height: '100%', borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(46,158,107,0.05)',
  },
  photoRemove:  { position: 'absolute', top: -6, right: -6, backgroundColor: Colors.background, borderRadius: 12 },
  primaryBadge: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  primaryText:  { fontSize: 10, color: '#fff', fontWeight: '700' },

  error:      { color: Colors.error, marginBottom: 12, textAlign: 'center', fontSize: 14 },
  input:      {
    borderWidth: 1.5, borderColor: Colors.glass.inputBorder, borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 12, color: Colors.text,
    backgroundColor: Colors.glass.inputBg, justifyContent: 'center',
  },
  valueText:       { fontSize: 16, color: Colors.text },
  placeholderText: { fontSize: 16, color: Colors.textSecondary },
  bioInput:        { height: 90 },
  charCount:       { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: -8, marginBottom: 12 },
  charCountWarn:   { color: Colors.error },

  questionLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 4 },
  questionHint:  { fontSize: 12, color: Colors.textSecondary, marginBottom: 10, fontWeight: '400' },

  levelRow:    { flexDirection: 'row', gap: 12, marginBottom: 4 },
  levelItem:   { flex: 1, alignItems: 'center' },
  levelDot:    {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.glass.inputBg,
  },
  levelDotActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  levelNum:       { fontSize: 16, color: Colors.textSecondary, fontWeight: '600' },
  levelNumActive: { color: '#fff' },

  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  optionChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.glass.inputBg,
  },
  optionChipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  optionText:       { fontSize: 13, color: Colors.textSecondary },
  optionTextActive: { color: Colors.primary, fontWeight: '600' },

  chipWrap:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip:         {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.glass.inputBg,
  },
  chipActive:   { borderColor: Colors.primary, backgroundColor: 'rgba(46,158,107,0.12)' },
  chipDisabled: { opacity: 0.4 },
  chipText:     { fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontWeight: '600' },

  tagCategory:  { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginTop: 12, marginBottom: 8 },

  saveText:     { color: Colors.text, fontSize: 16, fontWeight: '700' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  deleteText:   { fontSize: 14, color: Colors.error },

  modalOverlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26,10,0,0.35)' },
  modalContent:  { backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalCancel:   { fontSize: 16, color: Colors.textSecondary },
  modalDone:     { fontSize: 16, color: Colors.primary, fontWeight: '700' },
});