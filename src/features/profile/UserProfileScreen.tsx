import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Dimensions, Image, SafeAreaView, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { discoverService, DiscoverProfile } from '../../services/discoverService';
import { Dog } from '../../services/dogService';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { translateTag } from '../../i18n/translateTag';
import { translateBreed } from '../../i18n/translateBreed';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

const { width: SW } = Dimensions.get('window');
const PHOTO_W = SW - 40;
const PHOTO_H = PHOTO_W * 1.1;

function getAge(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function PhotoCarousel({ uris, placeholder }: { uris: string[]; placeholder: string }) {
  const [index, setIndex] = useState(0);

  if (uris.length === 0) {
    return (
      <View style={[styles.photo, styles.photoPlaceholder]}>
        <Text style={{ fontSize: 64 }}>{placeholder}</Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / PHOTO_W))}
      >
        {uris.map((uri, i) => (
          <Image key={i} source={{ uri }} style={styles.photo} resizeMode="cover" />
        ))}
      </ScrollView>
      {uris.length > 1 && (
        <View style={styles.dotsRow}>
          {uris.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

function DogCard({ dog }: { dog: Dog }) {
  const { t, i18n } = useTranslation();
  const age = getAge(dog.dateOfBirth);
  const photos = dog.photos.length > 0
    ? dog.photos.map(p => p.imageData)
    : dog.profilePicture ? [dog.profilePicture] : [];

  return (
    <GlassCard padding={0} style={styles.dogCard}>
      <PhotoCarousel uris={photos} placeholder="🐶" />
      <View style={styles.dogInfo}>
        <Text style={styles.dogName}>
          {dog.name}{age !== null ? `, ${age}` : ''}
        </Text>
        {dog.breed && <Text style={styles.subLine}>{translateBreed(dog.breed, i18n.language)}</Text>}
        {dog.tags.length > 0 && (
          <View style={styles.tagRow}>
            {dog.tags.map(tag => (
              <View key={tag} style={styles.tag}><Text style={styles.tagText}>{translateTag(tag, t)}</Text></View>
            ))}
          </View>
        )}
        {dog.loves.length > 0 && (
          <Text style={styles.detailLine}>{t('profile.userProfile.lovesPrefix')}{dog.loves.join(', ')}</Text>
        )}
        {dog.bio ? <Text style={styles.bioText}>{dog.bio}</Text> : null}
      </View>
    </GlassCard>
  );
}

export default function UserProfileScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const { userId } = route.params;
  const [profile, setProfile] = useState<DiscoverProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    discoverService.getUserProfile(userId)
      .then(setProfile)
      .catch(() => setError(t('profile.userProfile.notAvailable')));
  }, [userId, t]);

  const ownerPhotos = profile
    ? (profile.photos.length > 0
        ? profile.photos.map(p => p.imageData)
        : profile.profilePicture ? [profile.profilePicture] : [])
    : [];
  const ownerTags = profile ? [...(profile.lifestyleTags ?? []), ...(profile.personalityTags ?? [])] : [];

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{profile?.name ?? t('profile.userProfile.profileFallback')}</Text>
        <View style={{ width: 26 }} />
      </View>

      {!profile ? (
        <View style={styles.centered}>
          {error ? (
            <>
              <Text style={styles.emptyEmoji}>🐾</Text>
              <Text style={styles.emptyText}>{error}</Text>
            </>
          ) : (
            <ActivityIndicator size="large" color={Colors.primary} />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Owner */}
          <GlassCard padding={0}>
            <PhotoCarousel uris={ownerPhotos} placeholder="👤" />
            <View style={styles.dogInfo}>
              <Text style={styles.dogName}>
                {profile.name}{profile.age !== null ? `, ${profile.age}` : ''}
              </Text>
              {profile.relationshipStatus && <Text style={styles.subLine}>{translateTag(profile.relationshipStatus, t)}</Text>}
              {ownerTags.length > 0 && (
                <View style={styles.tagRow}>
                  {ownerTags.map(tag => (
                    <View key={tag} style={styles.tag}><Text style={styles.tagText}>{translateTag(tag, t)}</Text></View>
                  ))}
                </View>
              )}
              {profile.bio ? <Text style={styles.bioText}>{profile.bio}</Text> : null}
            </View>
          </GlassCard>

          {/* Dogs */}
          {profile.dogs.length > 0 && (
            <Text style={styles.sectionTitle}>
              {t('profile.userProfile.theirDog', { count: profile.dogs.length })} 🐾
            </Text>
          )}
          {profile.dogs.map(dog => <DogCard key={dog.id} dog={dog} />)}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, flexShrink: 1 },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },

  photo:            { width: PHOTO_W, height: PHOTO_H, backgroundColor: '#e6f4ec' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },

  dotsRow:   { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)' },
  dotActive: { backgroundColor: '#fff' },

  dogCard: { marginTop: 16 },
  dogInfo: { padding: 18 },
  dogName: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  subLine: { fontSize: 14, color: Colors.textSecondary, marginBottom: 8 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tag: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    backgroundColor: 'rgba(46,158,107,0.12)', borderWidth: 1, borderColor: Colors.border,
  },
  tagText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },

  detailLine: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  bioText:    { fontSize: 14, color: Colors.text, lineHeight: 20 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginTop: 24, marginBottom: 2 },

  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText:  { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
});
