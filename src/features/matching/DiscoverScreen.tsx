import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Image, PanResponder,
  SafeAreaView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { discoverService, DiscoverProfile } from '../../services/discoverService';
import { Dog } from '../../services/dogService';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassTabBar } from '../../components/GlassTabBar';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 32;
const CARD_H = CARD_W * 1.42;
const SWIPE_THRESHOLD = 100;

type FlatPhoto = { uri: string; dogIndex: number };

function getAge(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

function formatDistance(km: number): string {
  if (km < 0) return '';
  if (km < 1) return '< 1 km away';
  return `${Math.round(km)} km away`;
}

function buildFlatPhotos(profile: DiscoverProfile): FlatPhoto[] {
  return profile.dogs.flatMap((dog, di) => {
    const uris = dog.photos.length > 0
      ? dog.photos.map(p => p.imageData)
      : dog.profilePicture ? [dog.profilePicture] : [''];
    return uris.map(uri => ({ uri, dogIndex: di }));
  });
}

export default function DiscoverScreen() {
  const [feed, setFeed] = useState<DiscoverProfile[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [showOwner, setShowOwner] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [ownerPhotoIndex, setOwnerPhotoIndex] = useState(0);
  const [matchProfile, setMatchProfile] = useState<DiscoverProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pan = useRef(new Animated.ValueXY()).current;
  const treatOpacity   = pan.x.interpolate({ inputRange: [30, 100],   outputRange: [0, 1], extrapolate: 'clamp' });
  const noTreatOpacity = pan.x.interpolate({ inputRange: [-100, -30], outputRange: [1, 0], extrapolate: 'clamp' });
  const rotate = pan.x.interpolate({ inputRange: [-150, 150], outputRange: ['-12deg', '12deg'] });
  const nextCardScale = pan.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0, SWIPE_THRESHOLD], outputRange: [1, 0.94, 1], extrapolate: 'clamp' });

  const loadFeed = useCallback(() => {
    setLoading(true);
    setError(null);
    discoverService.getFeed()
      .then(data => { setFeed(data); setIdx(0); })
      .catch(err => setError(err?.response?.data?.message ?? 'Could not load feed. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const advanceCard = useCallback(() => {
    setIdx(i => i + 1);
    setPhotoIndex(0);
    setOwnerPhotoIndex(0);
    setShowOwner(false);
    pan.setValue({ x: 0, y: 0 });
    setSwiping(false);
  }, [pan]);

  const handleSwipe = useCallback((action: 'LIKE' | 'PASS', dy: number) => {
    if (swiping) return;
    const profile = feed[idx];
    if (!profile) return;

    setSwiping(true);
    const toX = action === 'LIKE' ? SW + 100 : -SW - 100;

    Animated.timing(pan, { toValue: { x: toX, y: dy }, duration: 280, useNativeDriver: false }).start(() => {
      discoverService.swipe(profile.userId, action)
        .then(res => { if (res.match) setMatchProfile(profile); })
        .catch(() => {})
        .finally(() => advanceCard());
    });
  }, [swiping, feed, idx, pan, advanceCard]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dy) < 40,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD)       handleSwipe('LIKE', g.dy);
        else if (g.dx < -SWIPE_THRESHOLD) handleSwipe('PASS', g.dy);
        else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <FloatingBackground />
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
        <GlassTabBar activeTab="Discover" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <FloatingBackground />
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>⚠️</Text>
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptySub}>{error}</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadFeed}>
            <Text style={styles.refreshBtnText}>Try again</Text>
          </TouchableOpacity>
        </View>
        <GlassTabBar activeTab="Discover" />
      </SafeAreaView>
    );
  }

  const profile = feed[idx];

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <FloatingBackground />
        <View style={styles.centered}>
          <Text style={styles.emptyEmoji}>🐾</Text>
          <Text style={styles.emptyTitle}>No more dogs nearby</Text>
          <Text style={styles.emptySub}>Check back later or expand your distance.</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadFeed}>
            <Text style={styles.refreshBtnText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        <GlassTabBar activeTab="Discover" />
      </SafeAreaView>
    );
  }

  const flatPhotos = buildFlatPhotos(profile);
  const currentDogIndex = flatPhotos[photoIndex]?.dogIndex ?? 0;
  const currentDog: Dog | undefined = profile.dogs[currentDogIndex];
  const ownerPhotos = profile.photos.length > 0
    ? profile.photos.map(p => p.imageData)
    : profile.profilePicture ? [profile.profilePicture] : [];
  const ownerAge = getAge(profile.dateOfBirth);
  const ownerTags = [...(profile.lifestyleTags ?? []), ...(profile.personalityTags ?? [])];
  const nextProfile = feed[idx + 1];

  const tapPhoto = (side: 'left' | 'right') => {
    if (showOwner) {
      if (ownerPhotos.length <= 1) return;
      setOwnerPhotoIndex(i => side === 'right' ? Math.min(i + 1, ownerPhotos.length - 1) : Math.max(i - 1, 0));
    } else {
      if (flatPhotos.length <= 1) return;
      setPhotoIndex(i => side === 'right' ? Math.min(i + 1, flatPhotos.length - 1) : Math.max(i - 1, 0));
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover</Text>
        {profile.distanceKm >= 0 && (
          <Text style={styles.headerDist}>{formatDistance(profile.distanceKm)}</Text>
        )}
      </View>

      <Text style={styles.hint}>
        <Text style={styles.hintNo}>← No treat</Text>
        {'  ·  '}
        <Text style={styles.hintYes}>Treat →</Text>
      </Text>

      <View style={styles.cardWrap}>
        {/* Background (next) card */}
        {nextProfile && (
          <Animated.View style={[styles.card, styles.cardNext, { transform: [{ scale: nextCardScale }] }]}>
            {nextProfile.dogs[0]?.profilePicture
              ? <Image source={{ uri: nextProfile.dogs[0].profilePicture }} style={styles.photo} resizeMode="cover" />
              : <View style={[styles.photo, styles.photoPlaceholder]}><Text style={{ fontSize: 64 }}>🐶</Text></View>
            }
          </Animated.View>
        )}

        {/* Foreground (current) card */}
        <Animated.View
          style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
          {...panResponder.panHandlers}
        >
          {showOwner ? (
            ownerPhotos.length > 0
              ? <Image source={{ uri: ownerPhotos[ownerPhotoIndex] }} style={styles.photo} resizeMode="cover" />
              : <View style={[styles.photo, styles.photoPlaceholder]}><Text style={{ fontSize: 64 }}>👤</Text></View>
          ) : (
            flatPhotos[photoIndex]?.uri
              ? <Image source={{ uri: flatPhotos[photoIndex].uri }} style={styles.photo} resizeMode="cover" />
              : <View style={[styles.photo, styles.photoPlaceholder]}><Text style={{ fontSize: 64 }}>🐶</Text></View>
          )}

          {/* Progress bars */}
          {showOwner ? (
            ownerPhotos.length > 1 && (
              <View style={styles.progressRow}>
                {ownerPhotos.map((_, i) => (
                  <View key={i} style={[styles.progressBar, i === ownerPhotoIndex && styles.progressBarActive]} />
                ))}
              </View>
            )
          ) : (
            flatPhotos.length > 1 && (
              <View style={styles.progressRow}>
                {flatPhotos.map((_, i) => (
                  <View key={i} style={[styles.progressBar, i === photoIndex && styles.progressBarActive]} />
                ))}
              </View>
            )
          )}

          <TouchableOpacity style={styles.tapLeft}  onPress={() => tapPhoto('left')} />
          <TouchableOpacity style={styles.tapRight} onPress={() => tapPhoto('right')} />

          <Animated.View style={[styles.treatBadge, { opacity: treatOpacity }]}>
            <Text style={styles.treatText}>TREAT 🦴</Text>
          </Animated.View>
          <Animated.View style={[styles.noTreatBadge, { opacity: noTreatOpacity }]}>
            <Text style={styles.noTreatText}>NO TREAT 🚫</Text>
          </Animated.View>

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.82)']}
            locations={[0, 0.4, 1]}
            style={styles.gradient}
          >
            {showOwner ? (
              <View style={styles.infoContent}>
                <Text style={styles.mainName}>
                  {profile.name}{ownerAge !== null ? `, ${ownerAge}` : ''}
                </Text>
                {profile.relationshipStatus && (
                  <Text style={styles.subLine}>{profile.relationshipStatus}</Text>
                )}
                {ownerTags.length > 0 && (
                  <View style={styles.tagRow}>
                    {ownerTags.slice(0, 5).map(tag => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {profile.bio ? <Text style={styles.bioText} numberOfLines={2}>{profile.bio}</Text> : null}
              </View>
            ) : (
              <View style={styles.infoContent}>
                <View style={styles.dogNameRow}>
                  {profile.dogs.map((dog, di) => {
                    const age = getAge(dog.dateOfBirth);
                    const active = di === currentDogIndex;
                    return (
                      <Text key={dog.id} style={[styles.dogNameTab, active && styles.dogNameTabActive]}>
                        {dog.name}{age !== null ? `, ${age}` : ''}{di < profile.dogs.length - 1 ? '  ' : ''}
                      </Text>
                    );
                  })}
                </View>
                {currentDog?.breed && <Text style={styles.subLine}>{currentDog.breed}</Text>}
                {currentDog?.tags && currentDog.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {currentDog.tags.slice(0, 5).map(tag => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {currentDog?.bio ? <Text style={styles.bioText} numberOfLines={2}>{currentDog.bio}</Text> : null}
              </View>
            )}

            <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowOwner(v => !v)}>
              {showOwner ? (
                flatPhotos[0]?.uri
                  ? <Image source={{ uri: flatPhotos[0].uri }} style={styles.toggleAvatar} resizeMode="cover" />
                  : <Ionicons name="paw" size={18} color="#fff" />
              ) : (
                profile.profilePicture
                  ? <Image source={{ uri: profile.profilePicture }} style={styles.toggleAvatar} resizeMode="cover" />
                  : <Ionicons name="person" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionPass]}
          onPress={() => !swiping && handleSwipe('PASS', 0)}
        >
          <Ionicons name="close" size={32} color="#e53e3e" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionLike]}
          onPress={() => !swiping && handleSwipe('LIKE', 0)}
        >
          <Text style={{ fontSize: 24 }}>🦴</Text>
        </TouchableOpacity>
      </View>

      {/* Match overlay */}
      {matchProfile && (
        <View style={styles.matchOverlay}>
          <Text style={styles.matchTitle}>It's a Match! 🐾</Text>
          <View style={styles.matchAvatarRow}>
            {matchProfile.profilePicture
              ? <Image source={{ uri: matchProfile.profilePicture }} style={styles.matchAvatar} resizeMode="cover" />
              : <View style={[styles.matchAvatar, styles.photoPlaceholder]}><Text style={{ fontSize: 36 }}>👤</Text></View>
            }
          </View>
          <Text style={styles.matchSub}>{matchProfile.name} also gave you a treat!</Text>
          <TouchableOpacity style={styles.matchBtn} onPress={() => setMatchProfile(null)}>
            <Text style={styles.matchBtnText}>Keep Swiping</Text>
          </TouchableOpacity>
        </View>
      )}

      <GlassTabBar activeTab="Discover" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  headerDist:  { fontSize: 13, color: Colors.text, opacity: 0.55 },
  hint:        { textAlign: 'center', fontSize: 13, marginBottom: 8 },
  hintNo:      { color: '#e53e3e', fontWeight: '600' },
  hintYes:     { color: Colors.primary, fontWeight: '600' },

  cardWrap: { alignItems: 'center', paddingHorizontal: 16, height: CARD_H + 10 },
  card: {
    width: CARD_W, height: CARD_H, borderRadius: 22, overflow: 'hidden',
    backgroundColor: '#111', position: 'absolute', zIndex: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 10,
  },
  cardNext: { top: 10, zIndex: 0 },

  photo:            { width: '100%', height: '100%', position: 'absolute' },
  photoPlaceholder: { backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },

  progressRow:       { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', gap: 4 },
  progressBar:       { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  progressBarActive: { backgroundColor: '#fff' },

  tapLeft:  { position: 'absolute', left: 0,  top: 0, width: '40%', height: '85%' },
  tapRight: { position: 'absolute', right: 0, top: 0, width: '40%', height: '85%' },

  treatBadge:   { position: 'absolute', top: 40, left: 16, borderWidth: 3, borderColor: Colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, transform: [{ rotate: '-15deg' }] },
  treatText:    { fontSize: 22, fontWeight: '900', color: Colors.primary },
  noTreatBadge: { position: 'absolute', top: 40, right: 16, borderWidth: 3, borderColor: '#e53e3e', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, transform: [{ rotate: '15deg' }] },
  noTreatText:  { fontSize: 22, fontWeight: '900', color: '#e53e3e' },

  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 60, paddingBottom: 18, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'flex-end',
  },

  infoContent: { flex: 1, marginRight: 12 },
  dogNameRow:  { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  dogNameTab:  { fontSize: 22, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  dogNameTabActive: { fontSize: 26, fontWeight: '800', color: '#fff' },
  mainName: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 2 },
  subLine:  { fontSize: 14, color: 'rgba(255,255,255,0.80)', marginBottom: 8 },
  tagRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  tag:      { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  tagText:  { fontSize: 11, color: '#fff', fontWeight: '600' },
  bioText:  { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },

  toggleBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end',
  },
  toggleAvatar: { width: 42, height: 42, borderRadius: 21 },

  actionRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 40,
    marginTop: 20, paddingBottom: 16,
  },
  actionBtn: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6,
  },
  actionPass: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#e53e3e' },
  actionLike: { backgroundColor: Colors.primary },

  emptyEmoji:  { fontSize: 64, marginBottom: 16 },
  emptyTitle:  { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  emptySub:    { fontSize: 15, color: Colors.text, opacity: 0.6, textAlign: 'center', marginBottom: 24 },
  refreshBtn:  { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 24 },
  refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  matchOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100, paddingHorizontal: 32,
  },
  matchTitle:    { fontSize: 36, fontWeight: '900', color: '#fff', marginBottom: 24, textAlign: 'center' },
  matchAvatarRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  matchAvatar:   { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: Colors.primary },
  matchSub:      { fontSize: 16, color: 'rgba(255,255,255,0.80)', textAlign: 'center', marginBottom: 32 },
  matchBtn:      { backgroundColor: Colors.primary, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 28 },
  matchBtnText:  { color: '#fff', fontWeight: '800', fontSize: 17 },
});
