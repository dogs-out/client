import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Image, RefreshControl, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { userService, UserProfile } from '../services/userService';
import { dogService, Dog } from '../services/dogService';
import { tokenStorage } from '../utils/tokenStorage';
import { FloatingBackground } from '../components/FloatingBackground';
import { GlassCard } from '../components/GlassCard';
import { GlassButton } from '../components/GlassButton';
import { Colors } from '../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [user, setUser]             = useState<UserProfile | null>(null);
  const [dogs, setDogs]             = useState<Dog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [userRes, dogsRes] = await Promise.all([
        userService.getMe(),
        dogService.getMyDogs(),
      ]);
      setUser(userRes);
      setDogs(dogsRes);
    } catch {
      // network error — keep stale data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleSignOut = async () => {
    await tokenStorage.remove();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const formatAge = (dob: string | null) => {
    if (!dob) return null;
    const age = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    return `${age} years old`;
  };

  if (loading) {
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
      <View style={styles.dimOverlay} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>My Profile</Text>
          <TouchableOpacity onPress={handleSignOut} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="log-out-outline" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Profile card */}
        <GlassCard style={styles.profileCard}>
          <View style={styles.profileRow}>
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={36} color={Colors.primary} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{user?.name ?? '—'}</Text>
              {formatAge(user?.dateOfBirth ?? null) && (
                <Text style={styles.meta}>{formatAge(user?.dateOfBirth ?? null)}</Text>
              )}
              {user?.bio ? (
                <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>
              ) : (
                <Text style={styles.bioEmpty}>No bio yet</Text>
              )}
            </View>
          </View>

          <GlassButton onPress={() => navigation.navigate('EditProfile')} style={styles.editButton}>
            <Ionicons name="pencil-outline" size={16} color={Colors.text} style={{ marginRight: 6 }} />
            <Text style={styles.editButtonText}>Edit profile</Text>
          </GlassButton>
        </GlassCard>

        {/* Dogs section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Dogs</Text>
          <TouchableOpacity
            style={styles.addDogButton}
            onPress={() => navigation.navigate('AddDog', {})}
          >
            <Ionicons name="add-circle" size={28} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {dogs.length === 0 ? (
          <GlassCard style={styles.emptyCard} padding={24}>
            <Text style={styles.emptyIcon}>🐾</Text>
            <Text style={styles.emptyTitle}>No dogs yet</Text>
            <Text style={styles.emptySubtitle}>Add your first dog to start matching</Text>
            <GlassButton onPress={() => navigation.navigate('AddDog', {})} style={styles.addFirstButton}>
              <Ionicons name="add" size={18} color={Colors.text} style={{ marginRight: 6 }} />
              <Text style={styles.addFirstButtonText}>Add a dog</Text>
            </GlassButton>
          </GlassCard>
        ) : (
          dogs.map(dog => (
            <GlassCard key={dog.id} style={styles.dogCard} padding={0}>
              <View style={styles.dogRow}>
                {dog.profilePicture ? (
                  <Image source={{ uri: dog.profilePicture }} style={styles.dogPhoto} />
                ) : (
                  <View style={styles.dogPhotoPlaceholder}>
                    <Text style={styles.dogEmoji}>🐶</Text>
                  </View>
                )}
                <View style={styles.dogInfo}>
                  <Text style={styles.dogName}>{dog.name}</Text>
                  <View style={styles.dogMeta}>
                    {dog.breed && (
                      <Text style={styles.dogMetaText}>{dog.breed}</Text>
                    )}
                    {dog.breed && dog.age != null && (
                      <Text style={styles.dogMetaDot}> · </Text>
                    )}
                    {dog.age != null && (
                      <Text style={styles.dogMetaText}>{dog.age} yr{dog.age !== 1 ? 's' : ''}</Text>
                    )}
                  </View>
                  {dog.bio && (
                    <Text style={styles.dogBio} numberOfLines={2}>{dog.bio}</Text>
                  )}
                </View>
              </View>
            </GlassCard>
          ))
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: Colors.background },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  dimOverlay:   { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(238,251,243,0.60)' },
  scroll:       { padding: 24, paddingTop: 60, paddingBottom: 40 },

  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle:    { fontSize: 30, fontWeight: '800', color: Colors.text },

  profileCard:  { marginBottom: 28 },
  profileRow:   { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  avatar:       { width: 80, height: 80, borderRadius: 40, marginRight: 16 },
  avatarPlaceholder: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(46,158,107,0.08)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border, marginRight: 16,
  },
  profileInfo:  { flex: 1 },
  name:         { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  meta:         { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  bio:          { fontSize: 14, color: Colors.text, lineHeight: 20 },
  bioEmpty:     { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic' },
  editButton:   {},
  editButtonText: { fontSize: 15, fontWeight: '600', color: Colors.text },

  sectionHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:   { fontSize: 20, fontWeight: '700', color: Colors.text },
  addDogButton:   { padding: 4 },

  emptyCard:      { alignItems: 'center', marginBottom: 16 },
  emptyIcon:      { fontSize: 40, marginBottom: 8 },
  emptyTitle:     { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle:  { fontSize: 14, color: Colors.textSecondary, marginBottom: 20, textAlign: 'center' },
  addFirstButton: {},
  addFirstButtonText: { fontSize: 15, fontWeight: '600', color: Colors.text },

  dogCard:      { marginBottom: 12 },
  dogRow:       { flexDirection: 'row', alignItems: 'center', padding: 16 },
  dogPhoto:     { width: 72, height: 72, borderRadius: 36, marginRight: 16 },
  dogPhotoPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(46,158,107,0.08)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.border, marginRight: 16,
  },
  dogEmoji:     { fontSize: 32 },
  dogInfo:      { flex: 1 },
  dogName:      { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  dogMeta:      { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dogMetaText:  { fontSize: 13, color: Colors.textSecondary },
  dogMetaDot:   { fontSize: 13, color: Colors.textSecondary },
  dogBio:       { fontSize: 13, color: Colors.text, lineHeight: 18 },

  bottomPad:    { height: 16 },
});