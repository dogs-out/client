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
import { userService } from '../../services/userService';
import { getApiError } from '../../utils/apiError';
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

export function ProfileForm({ title, subtitle, submitLabel, onBack, onSaved }: Props) {
  const [name, setName]                     = useState('');
  const [bio, setBio]                       = useState('');
  const [dateOfBirth, setDateOfBirth]       = useState<Date | null>(null);
  const [showPicker, setShowPicker]         = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [location, setLocation]             = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating]             = useState(false);
  const [loading, setLoading]               = useState(false);
  const [fetching, setFetching]             = useState(true);
  const [error, setError]                   = useState<string | null>(null);

  useEffect(() => {
    userService.getMe().then(user => {
      if (user.name) setName(user.name);
      if (user.bio) setBio(user.bio);
      if (user.dateOfBirth) setDateOfBirth(new Date(user.dateOfBirth));
      if (user.profilePicture) setProfilePicture(user.profilePicture);
      if (user.latitude && user.longitude) {
        setLocation({ latitude: user.latitude, longitude: user.longitude });
      }
    }).catch(() => {}).finally(() => setFetching(false));
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

  const handleSubmit = async () => {
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
      onSaved();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
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
      <View style={styles.dimOverlay} pointerEvents="none" />
      <KeyboardAvoidingView style={styles.kav} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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

          <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={Colors.primary} />
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
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />

          <Text style={styles.label}>Bio <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            placeholder="Tell other dog owners about yourself..."
            placeholderTextColor={Colors.textSecondary}
            value={bio}
            onChangeText={setBio}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Date of birth</Text>
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
                {dateOfBirth ? formatDate(dateOfBirth) : 'Select your date of birth'}
              </Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Location <Text style={styles.optional}>(optional)</Text></Text>
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
                  {location ? 'Location detected' : 'Detect my location'}
                </Text>
              </>
            )}
          </GlassButton>

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
    </View>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1, backgroundColor: Colors.background },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  dimOverlay:   { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(238,251,243,0.60)' },
  kav:          { flex: 1 },
  container:    { padding: 24, paddingTop: 56, paddingBottom: 40 },

  backButton:   { marginBottom: 8 },
  title:        { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  subtitle:     { fontSize: 16, color: Colors.textSecondary, marginBottom: 32 },

  avatarWrapper:     { alignSelf: 'center', marginBottom: 32 },
  avatar:            { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(46,158,107,0.08)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border,
  },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.primary, borderRadius: 12, padding: 6,
  },

  error:        { color: Colors.error, marginBottom: 12, textAlign: 'center' },
  label:        { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  optional:     { fontWeight: '400', color: Colors.textSecondary },
  input:        {
    borderWidth: 1.5, borderColor: Colors.glass.inputBorder, borderRadius: 12,
    padding: 14, fontSize: 16, marginBottom: 20, color: Colors.text,
    backgroundColor: Colors.glass.inputBg, justifyContent: 'center',
  },
  bioInput:     { height: 90 },
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
});
