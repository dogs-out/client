import { useEffect, useRef, useState } from 'react';
import {
  Animated, Dimensions, Image, PanResponder,
  SafeAreaView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../types/navigation';
import { dogService, Dog } from '../../services/dogService';
import { userService, UserProfile } from '../../services/userService';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassTabBar } from '../../components/GlassTabBar';

type Props = NativeStackScreenProps<RootStackParamList, 'SwipePreview'>;

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - 32;
const CARD_H = CARD_W * 1.42;
const SWIPE_THRESHOLD = 100;

type FlatPhoto = { uri: string; dogIndex: number };

export default function SwipePreviewScreen({ navigation }: Props) {
  const [dogs, setDogs]           = useState<Dog[]>([]);
  const [user, setUser]           = useState<UserProfile | null>(null);
  const [photoIndex, setPhotoIndex]           = useState(0);
  const [ownerPhotoIndex, setOwnerPhotoIndex] = useState(0);
  const [showOwner, setShowOwner] = useState(false);
  const [swipeResult, setSwipeResult] = useState<'treat' | 'notreat' | null>(null);

  const pan = useRef(new Animated.ValueXY()).current;
  const treatOpacity   = pan.x.interpolate({ inputRange: [30, 100],   outputRange: [0, 1], extrapolate: 'clamp' });
  const noTreatOpacity = pan.x.interpolate({ inputRange: [-100, -30], outputRange: [1, 0], extrapolate: 'clamp' });
  const rotate = pan.x.interpolate({ inputRange: [-150, 150], outputRange: ['-12deg', '12deg'] });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dy) < 40,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD) {
          setSwipeResult('treat');
          Animated.sequence([
            Animated.timing(pan, { toValue: { x: SW + 100, y: g.dy }, duration: 280, useNativeDriver: false }),
            Animated.delay(700),
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
          ]).start(() => setSwipeResult(null));
        } else if (g.dx < -SWIPE_THRESHOLD) {
          setSwipeResult('notreat');
          Animated.sequence([
            Animated.timing(pan, { toValue: { x: -SW - 100, y: g.dy }, duration: 280, useNativeDriver: false }),
            Animated.delay(700),
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }),
          ]).start(() => setSwipeResult(null));
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    Promise.all([dogService.getMyDogs(), userService.getMe()])
      .then(([d, u]) => { setDogs(d); setUser(u); })
      .catch(() => navigation.goBack());
  }, []);

  if (!dogs.length || !user) return null;

  // Build flat photo array across all dogs
  const flatPhotos: FlatPhoto[] = dogs.flatMap((dog, di) => {
    const photos = dog.photos.length > 0
      ? dog.photos.map(p => p.imageData)
      : dog.profilePicture ? [dog.profilePicture] : [''];
    return photos.map(uri => ({ uri, dogIndex: di }));
  });

  const currentDogIndex = flatPhotos[photoIndex]?.dogIndex ?? 0;
  const currentDog = dogs[currentDogIndex];

  const ownerPhotos = user.photos?.length > 0
    ? user.photos.map(p => p.imageData)
    : user.profilePicture ? [user.profilePicture] : [];

  const getAge = (dob: string | null) => dob
    ? Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null;

  const ownerAge = getAge(user.dateOfBirth);

  const tapPhoto = (side: 'left' | 'right') => {
    if (showOwner) {
      if (ownerPhotos.length <= 1) return;
      setOwnerPhotoIndex(i => side === 'right' ? Math.min(i + 1, ownerPhotos.length - 1) : Math.max(i - 1, 0));
    } else {
      if (flatPhotos.length <= 1) return;
      setPhotoIndex(i => side === 'right' ? Math.min(i + 1, flatPhotos.length - 1) : Math.max(i - 1, 0));
    }
  };

  const ownerTags = [...(user.lifestyleTags ?? []), ...(user.personalityTags ?? [])];

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Preview</Text>
        <View style={{ width: 26 }} />
      </View>

      <Text style={styles.hint}>
        <Text style={styles.hintNo}>← No treat</Text>
        {'  ·  '}
        <Text style={styles.hintYes}>Treat →</Text>
      </Text>

      <View style={styles.cardWrap}>
        <Animated.View
          style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
          {...panResponder.panHandlers}
        >
          {/* Background photo */}
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

          {/* Tap zones */}
          <TouchableOpacity style={styles.tapLeft}  onPress={() => tapPhoto('left')} />
          <TouchableOpacity style={styles.tapRight} onPress={() => tapPhoto('right')} />

          {/* TREAT / NO TREAT stamp */}
          <Animated.View style={[styles.treatBadge, { opacity: treatOpacity }]}>
            <Text style={styles.treatText}>TREAT 🦴</Text>
          </Animated.View>
          <Animated.View style={[styles.noTreatBadge, { opacity: noTreatOpacity }]}>
            <Text style={styles.noTreatText}>NO TREAT 🚫</Text>
          </Animated.View>

          {/* Gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.30)', 'rgba(0,0,0,0.82)']}
            locations={[0, 0.4, 1]}
            style={styles.gradient}
          >
            {showOwner ? (
              /* ── OWNER VIEW ── */
              <View style={styles.infoContent}>
                <Text style={styles.mainName}>
                  {user.name}{ownerAge !== null ? `, ${ownerAge}` : ''}
                </Text>
                {user.relationshipStatus && (
                  <Text style={styles.subLine}>{user.relationshipStatus}</Text>
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
                {user.bio ? <Text style={styles.bioText} numberOfLines={2}>{user.bio}</Text> : null}
              </View>
            ) : (
              /* ── DOG VIEW ── */
              <View style={styles.infoContent}>
                {/* Dog name tabs */}
                <View style={styles.dogNameRow}>
                  {dogs.map((dog, idx) => {
                    const age = getAge(dog.dateOfBirth);
                    const active = idx === currentDogIndex;
                    return (
                      <Text
                        key={dog.id}
                        style={[styles.dogNameTab, active && styles.dogNameTabActive]}
                      >
                        {dog.name}{age !== null ? `, ${age}` : ''}
                        {idx < dogs.length - 1 ? '  ' : ''}
                      </Text>
                    );
                  })}
                </View>
                {currentDog.breed && <Text style={styles.subLine}>{currentDog.breed}</Text>}
                {currentDog.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {currentDog.tags.slice(0, 5).map(tag => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {currentDog.bio ? <Text style={styles.bioText} numberOfLines={2}>{currentDog.bio}</Text> : null}
              </View>
            )}

            {/* Toggle button */}
            <TouchableOpacity style={styles.toggleBtn} onPress={() => setShowOwner(v => !v)}>
              {showOwner ? (
                flatPhotos[0]?.uri
                  ? <Image source={{ uri: flatPhotos[0].uri }} style={styles.toggleAvatar} resizeMode="cover" />
                  : <Ionicons name="paw" size={18} color="#fff" />
              ) : (
                user.profilePicture
                  ? <Image source={{ uri: user.profilePicture }} style={styles.toggleAvatar} resizeMode="cover" />
                  : <Ionicons name="person" size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>

      {swipeResult && (
        <View style={[styles.toast, swipeResult === 'treat' ? styles.toastTreat : styles.toastNoTreat]}>
          <Text style={styles.toastText}>{swipeResult === 'treat' ? 'Treat! 🦴' : 'No treat 🚫'}</Text>
        </View>
      )}

      <GlassTabBar activeTab="Profile" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  hint:        { textAlign: 'center', fontSize: 13, marginBottom: 10 },
  hintNo:      { color: '#e53e3e', fontWeight: '600' },
  hintYes:     { color: Colors.primary, fontWeight: '600' },

  cardWrap: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    width: CARD_W, height: CARD_H, borderRadius: 22, overflow: 'hidden',
    backgroundColor: '#111',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 10,
  },

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

  dogNameRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  dogNameTab: { fontSize: 22, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  dogNameTabActive: {
    fontSize: 26, fontWeight: '800', color: '#fff',
  },

  mainName: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 2 },
  subLine:  { fontSize: 14, color: 'rgba(255,255,255,0.80)', marginBottom: 8 },
  tagRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 8 },
  tag:      {
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  tagText:  { fontSize: 11, color: '#fff', fontWeight: '600' },
  bioText:  { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 18 },

  toggleBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  toggleAvatar: { width: 42, height: 42, borderRadius: 21 },

  toast:        { position: 'absolute', alignSelf: 'center', top: CARD_H * 0.55, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16 },
  toastTreat:   { backgroundColor: 'rgba(46,158,107,0.92)' },
  toastNoTreat: { backgroundColor: 'rgba(229,62,62,0.92)' },
  toastText:    { color: '#fff', fontSize: 18, fontWeight: '800' },
});
