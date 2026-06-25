import { useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { dogService } from '../../services/dogService';
import { getApiError } from '../../utils/apiError';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'AddDog'>;

export default function AddDogScreen({ navigation, route }: Props) {
  const fromOnboarding = route.params?.fromOnboarding ?? false;

  const [name, setName]         = useState('');
  const [breed, setBreed]       = useState('');
  const [age, setAge]           = useState('');
  const [bio, setBio]           = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo library access is required to add a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Your dog needs a name.'); return; }
    setLoading(true);
    setError(null);
    try {
      let profilePicture: string | undefined;
      if (imageUri) {
        profilePicture = await dogService.uploadImage(imageUri);
      }
      await dogService.createDog({
        name: name.trim(),
        breed: breed.trim() || undefined,
        age: age ? parseInt(age, 10) : undefined,
        bio: bio.trim() || undefined,
        profilePicture,
      });
      if (fromOnboarding) {
        navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
      } else {
        navigation.goBack();
      }
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <FloatingBackground />
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          {!fromOnboarding && (
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={28} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.title}>
            {fromOnboarding ? 'Introduce your dog 🐾' : 'Add a dog'}
          </Text>
          <Text style={styles.subtitle}>
            {fromOnboarding
              ? 'Other dog owners will see this when you match'
              : 'Tell us about your furry friend'}
          </Text>

          <GlassCard style={styles.card}>
            {/* Photo picker */}
            <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="camera-outline" size={36} color={Colors.primary} />
                  <Text style={styles.photoHint}>Add photo</Text>
                </View>
              )}
              <View style={styles.photoBadge}>
                <Ionicons name="camera" size={13} color="#fff" />
              </View>
            </TouchableOpacity>

            {error && <Text style={styles.error}>{error}</Text>}

            <TextInput
              style={styles.input}
              placeholder="Name *"
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder="Breed"
              placeholderTextColor={Colors.textSecondary}
              value={breed}
              onChangeText={setBreed}
            />
            <TextInput
              style={styles.input}
              placeholder="Age (years)"
              placeholderTextColor={Colors.textSecondary}
              value={age}
              onChangeText={setAge}
              keyboardType="number-pad"
            />
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Bio — what makes your dog special?"
              placeholderTextColor={Colors.textSecondary}
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {loading ? (
              <ActivityIndicator style={{ marginTop: 16 }} color={Colors.primary} />
            ) : (
              <GlassButton onPress={handleSave} style={styles.saveButton}>
                <Text style={styles.saveButtonText}>
                  {fromOnboarding ? "Let's go 🐾" : 'Save dog'}
                </Text>
              </GlassButton>
            )}
          </GlassCard>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: Colors.background },
  kav:              { flex: 1 },
  scroll:           { padding: 24, paddingTop: 56, paddingBottom: 40 },
  header:           { flexDirection: 'row', marginBottom: 8 },
  title:            { fontSize: 30, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  subtitle:         { fontSize: 15, color: Colors.textSecondary, marginBottom: 24 },
  card:             { width: '100%' },
  photoPicker:      { alignSelf: 'center', marginBottom: 24, position: 'relative' },
  photo:            { width: 110, height: 110, borderRadius: 55 },
  photoPlaceholder: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(46,158,107,0.10)',
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  photoHint:        { fontSize: 12, color: Colors.primary, marginTop: 4, fontWeight: '600' },
  photoBadge:       {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.primary, borderRadius: 12, padding: 6,
  },
  error:            { color: Colors.error, marginBottom: 12, textAlign: 'center', fontSize: 14 },
  input:            {
    borderWidth: 1.5, borderColor: Colors.glass.inputBorder, borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 12, color: Colors.text,
    backgroundColor: Colors.glass.inputBg,
  },
  bioInput:         { height: 90 },
  saveButton:       { marginTop: 4 },
  saveButtonText:   { color: Colors.text, fontSize: 16, fontWeight: '700' },
});