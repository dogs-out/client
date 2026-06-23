import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { userService } from '../services/userService';
import { getApiError } from '../utils/apiError';
import { FloatingBackground } from '../components/FloatingBackground';

type Props = NativeStackScreenProps<RootStackParamList, 'ProfileSetup'>;

const MIN_AGE = 18;

function isOldEnough(date: Date): boolean {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - MIN_AGE);
  return date <= cutoff;
}

export default function ProfileSetupScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userService.getMe().then(user => {
      if (user.name) setName(user.name);
      if (user.bio) setBio(user.bio);
      if (user.dateOfBirth) setDateOfBirth(new Date(user.dateOfBirth));
      if (user.profilePicture) setProfilePicture(user.profilePicture);
      if (user.latitude && user.longitude) {
        setLocation({ latitude: user.latitude, longitude: user.longitude });
      }
    }).catch(() => {});
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo library access is needed to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setProfilePicture(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const detectLocation = async () => {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location access is needed to find nearby dogs.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      setError('Could not get location. Please try again.');
    } finally {
      setLocating(false);
    }
  };

  const handleContinue = async () => {
    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!dateOfBirth) { setError('Please select your date of birth.'); return; }
    if (!isOldEnough(dateOfBirth)) { setError('You must be at least 18 years old to use Dogs Out.'); return; }
    setLoading(true);
    setError(null);
    try {
      await userService.updateProfile({
        name: name.trim(),
        bio: bio.trim() || undefined,
        dateOfBirth: dateOfBirth.toISOString().split('T')[0],
        latitude: location?.latitude,
        longitude: location?.longitude,
        profilePicture: profilePicture ?? undefined,
      });
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  const defaultPickerDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 25);
    return d;
  })();

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <FloatingBackground />

        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>Tell us a bit about yourself</Text>

        {/* Profile picture */}
        <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage}>
          {profilePicture ? (
            <Image source={{ uri: profilePicture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={48} color="#ccc" />
            </View>
          )}
          <View style={styles.avatarBadge}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your name"
          value={name}
          onChangeText={setName}
          autoComplete="name"
        />

        <Text style={styles.label}>Bio <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={[styles.input, styles.bioInput]}
          placeholder="Tell other dog owners about yourself..."
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Date of birth</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
          <Text style={dateOfBirth ? styles.dateText : styles.datePlaceholder}>
            {dateOfBirth ? formatDate(dateOfBirth) : 'Select your date of birth'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Location <Text style={styles.optional}>(optional)</Text></Text>
        <TouchableOpacity
          style={[styles.locationButton, location && styles.locationButtonActive]}
          onPress={detectLocation}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={location ? 'location' : 'location-outline'}
                size={18}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.locationButtonText}>
                {location ? 'Location detected' : 'Detect my location'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 24 }} />
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <Text style={styles.buttonText}>Let's go 🐾</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* iOS date picker modal */}
      {Platform.OS === 'ios' && (
        <Modal visible={showPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  if (!dateOfBirth) setDateOfBirth(defaultPickerDate);
                  setShowPicker(false);
                }}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateOfBirth ?? defaultPickerDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(_, date) => { if (date) setDateOfBirth(date); }}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Android date picker (shows as native dialog) */}
      {Platform.OS === 'android' && showPicker && (
        <DateTimePicker
          value={dateOfBirth ?? defaultPickerDate}
          mode="date"
          maximumDate={new Date()}
          onChange={(_, date) => {
            setShowPicker(false);
            if (date) setDateOfBirth(date);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  avatarWrapper: { alignSelf: 'center', marginBottom: 32 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: '#111', borderRadius: 12, padding: 6,
  },
  error: { color: '#e53e3e', marginBottom: 12, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#111', marginBottom: 6 },
  optional: { fontWeight: '400', color: '#999' },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    padding: 14, fontSize: 16, marginBottom: 20, color: '#111',
    backgroundColor: '#fff', justifyContent: 'center',
  },
  bioInput: { height: 90 },
  dateText: { fontSize: 16, color: '#111' },
  datePlaceholder: { fontSize: 16, color: '#aaa' },
  locationButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#666', padding: 14, borderRadius: 8, marginBottom: 32,
  },
  locationButtonActive: { backgroundColor: '#48bb78' },
  locationButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  button: {
    backgroundColor: '#111', padding: 16, borderRadius: 8,
    alignItems: 'center', marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
  },
  modalCancel: { fontSize: 16, color: '#666' },
  modalDone: { fontSize: 16, color: '#111', fontWeight: '600' },
});