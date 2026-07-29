import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Image, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { discoverService, DiscoverProfile } from '../../services/discoverService';
import { sitterService } from '../../services/sitterService';
import { userService } from '../../services/userService';
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
  // pagingEnabled snaps by the *viewport* width. The card's border makes the
  // viewport a few px narrower than PHOTO_W, so fixed-width pages drift a bit
  // further each page (previous photo bleeds in at the left edge). Measure the
  // real viewport and size each page to exactly that.
  const [pageW, setPageW] = useState(PHOTO_W);

  if (uris.length === 0) {
    return (
      <View style={[styles.photo, styles.photoPlaceholder]}>
        <Text style={{ fontSize: 64 }}>{placeholder}</Text>
      </View>
    );
  }

  return (
    <View onLayout={e => setPageW(e.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / pageW))}
      >
        {uris.map((uri, i) => (
          <Image key={i} source={{ uri }} style={[styles.photo, { width: pageW }]} resizeMode="cover" />
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

function LevelDots({ level }: { level: number }) {
  return (
    <View style={styles.levelDots}>
      {[1, 2, 3, 4, 5].map(n => (
        <View key={n} style={[styles.levelDot, n <= level && styles.levelDotFilled]} />
      ))}
    </View>
  );
}

function DogCard({ dog }: { dog: Dog }) {
  const { t, i18n } = useTranslation();
  const age = getAge(dog.dateOfBirth);
  const photos = dog.photos.length > 0
    ? dog.photos.map(p => p.imageData)
    : dog.profilePicture ? [dog.profilePicture] : [];
  const hasPersonality = dog.energyLevel !== null || dog.socialBehavior !== null
    || dog.offLeash !== null || dog.kidsComfort !== null;

  return (
    <GlassCard padding={0} plain style={styles.dogCard}>
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
        {hasPersonality && (
          <View style={styles.personalityBox}>
            {dog.energyLevel !== null && (
              <View style={styles.personalityRow}>
                <Ionicons name="flash-outline" size={15} color={Colors.primary} />
                <Text style={styles.personalityLabel}>{t('profile.userProfile.energyLabel')}</Text>
                <LevelDots level={dog.energyLevel} />
              </View>
            )}
            {dog.socialBehavior !== null && (
              <View style={styles.personalityRow}>
                <Ionicons name="paw-outline" size={15} color={Colors.primary} />
                <Text style={styles.personalityLabel}>{t('profile.userProfile.socialLabel')}</Text>
                <Text style={styles.personalityValue}>{translateTag(dog.socialBehavior, t)}</Text>
              </View>
            )}
            {dog.offLeash !== null && (
              <View style={styles.personalityRow}>
                <Ionicons name="walk-outline" size={15} color={Colors.primary} />
                <Text style={styles.personalityLabel}>{t('profile.userProfile.offLeashLabel')}</Text>
                <Text style={styles.personalityValue}>{translateTag(dog.offLeash, t)}</Text>
              </View>
            )}
            {dog.kidsComfort !== null && (
              <View style={styles.personalityRow}>
                <Ionicons name="happy-outline" size={15} color={Colors.primary} />
                <Text style={styles.personalityLabel}>{t('profile.userProfile.kidsLabel')}</Text>
                <LevelDots level={dog.kidsComfort} />
              </View>
            )}
          </View>
        )}
        {dog.loves.length > 0 && (
          <Text style={styles.detailLine}>{t('profile.userProfile.lovesPrefix')}{dog.loves.map(l => translateTag(l, t)).join(', ')}</Text>
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
  const [amSitter, setAmSitter] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);
  const [contacting, setContacting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    discoverService.getUserProfile(userId)
      .then(setProfile)
      .catch(() => setError(t('profile.userProfile.notAvailable')));
    userService.getMe()
      .then(me => { setAmSitter(me.isSitter); setMyId(me.id); })
      .catch(() => {});
  }, [userId, t]);

  const contactSeeker = () => {
    if (!profile || contacting) return;
    setContacting(true);
    sitterService.contact(profile.userId)
      .then(({ matchId }) => {
        navigation.navigate('ChatDetail', {
          matchId,
          otherUserId: profile.userId,
          name: profile.name,
          profilePicture: profile.profilePicture,
        });
      })
      .catch(() => Alert.alert(t('common.error'), t('profile.userProfile.contactError')))
      .finally(() => setContacting(false));
  };

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
          <GlassCard padding={0} plain>
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

          {/* Sitter info */}
          {profile.isSitter && (
            <GlassCard style={styles.sitterCard}>
              <View style={styles.sitterBadgeRow}>
                <Ionicons name="shield-checkmark" size={18} color={Colors.primary} />
                <Text style={styles.sitterBadgeText}>{t('sitter.profile.badge')}</Text>
              </View>
              {profile.sitterExperienceYears !== null && (
                <Text style={styles.sitterLine}>
                  {t('sitter.profile.experience')}{' '}
                  <Text style={styles.sitterValue}>
                    {profile.sitterExperienceYears >= 10 ? '10+' : profile.sitterExperienceYears} {t('sitter.profile.experienceYears')}
                  </Text>
                </Text>
              )}
              {profile.sitterWeekdays.length > 0 && (
                <>
                  <Text style={styles.sitterLine}>{t('sitter.profile.availability')}</Text>
                  <View style={styles.tagRow}>
                    {profile.sitterWeekdays.map(day => (
                      <View key={day} style={styles.tag}><Text style={styles.tagText}>{translateTag(day, t)}</Text></View>
                    ))}
                  </View>
                </>
              )}
              {profile.sitterTags.length > 0 && (
                <View style={styles.tagRow}>
                  {profile.sitterTags.map(tag => (
                    <View key={tag} style={styles.tag}><Text style={styles.tagText}>{translateTag(tag, t)}</Text></View>
                  ))}
                </View>
              )}
            </GlassCard>
          )}

          {/* Contact as sitter */}
          {profile.lookingForSitter && amSitter && myId !== null && myId !== profile.userId && (
            <TouchableOpacity style={styles.contactBtn} onPress={contactSeeker} disabled={contacting}>
              {contacting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="chatbubble-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.contactText}>{t('sitter.list.contact')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

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

  personalityBox: { marginBottom: 10, gap: 7 },
  personalityRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  personalityLabel: { fontSize: 13, color: Colors.textSecondary },
  personalityValue: { fontSize: 13, color: Colors.text, fontWeight: '600', flexShrink: 1 },

  levelDots:      { flexDirection: 'row', gap: 4 },
  levelDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(46,158,107,0.18)' },
  levelDotFilled: { backgroundColor: Colors.primary },

  detailLine: { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  bioText:    { fontSize: 14, color: Colors.text, lineHeight: 20 },

  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.text, marginTop: 24, marginBottom: 2 },

  sitterCard:      { marginTop: 16 },
  sitterBadgeRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sitterBadgeText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  sitterLine:      { fontSize: 13, color: Colors.textSecondary, marginBottom: 6 },
  sitterValue:     { color: Colors.text, fontWeight: '700' },

  contactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 16, paddingVertical: 12, borderRadius: 16,
    backgroundColor: Colors.primary,
  },
  contactText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText:  { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
});
