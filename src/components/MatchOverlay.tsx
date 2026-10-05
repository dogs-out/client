import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RemoteImage } from './ui/RemoteImage';
import { Colors } from '../constants/colors';

const { width: SW } = Dimensions.get('window');

/**
 * US-07: two dogs run to each other, hearts pop, chat CTA.
 *
 * <p>Shown to the second swiper in Discover the moment it happens, and to the
 * first liker on their next visit (see PendingMatchCelebration).
 */
export function MatchOverlay({ name, picture, myPicture, onChat, onDismiss }: Readonly<{
  /** The other person. */
  name: string;
  picture: string | null;
  myPicture: string | null;
  onChat: () => void;
  onDismiss: () => void;
}>) {
  const { t } = useTranslation();
  const fade        = useRef(new Animated.Value(0)).current;
  const titleScale  = useRef(new Animated.Value(0.3)).current;
  const leftDogX    = useRef(new Animated.Value(-SW / 2)).current;
  const rightDogX   = useRef(new Animated.Value(SW / 2)).current;
  const heartsScale = useRef(new Animated.Value(0)).current;
  const restOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(titleScale, { toValue: 1, friction: 5, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.spring(leftDogX,  { toValue: 0, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.spring(rightDogX, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true }),
      ]),
      Animated.spring(heartsScale, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.timing(restOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.matchOverlay, { opacity: fade }]}>
      <Animated.Text style={[styles.matchTitle, { transform: [{ scale: titleScale }] }]}>
        {t('matching.discover.matchTitle')}
      </Animated.Text>

      <View style={styles.matchDogsRow}>
        <Animated.Text style={[styles.matchDog, { transform: [{ translateX: leftDogX }] }]}>🐕</Animated.Text>
        <Animated.Text style={[styles.matchHearts, { transform: [{ scale: heartsScale }] }]}>💞</Animated.Text>
        <Animated.Text style={[styles.matchDog, { transform: [{ translateX: rightDogX }, { scaleX: -1 }] }]}>🐕</Animated.Text>
      </View>

      <Animated.View style={{ opacity: restOpacity, alignItems: 'center' }}>
        <View style={styles.matchAvatarRow}>
          {myPicture
            ? <RemoteImage source={{ uri: myPicture }} style={styles.matchAvatar} resizeMode="cover" />
            : <View style={[styles.matchAvatar, styles.photoPlaceholder]}><Text style={{ fontSize: 36 }}>👤</Text></View>
          }
          {picture
            ? <RemoteImage source={{ uri: picture }} style={styles.matchAvatar} resizeMode="cover" />
            : <View style={[styles.matchAvatar, styles.photoPlaceholder]}><Text style={{ fontSize: 36 }}>👤</Text></View>
          }
        </View>
        <Text style={styles.matchSub}>{t('matching.discover.matchSub', { name })}</Text>
        <TouchableOpacity style={styles.matchBtn} onPress={onChat}>
          <Text style={styles.matchBtnText}>{t('matching.discover.chatNow')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.matchSecondaryBtn} onPress={onDismiss}>
          <Text style={styles.matchSecondaryText}>{t('matching.discover.keepSwiping')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  photoPlaceholder: { backgroundColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  matchOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 100, paddingHorizontal: 32,
  },
  matchTitle:    { fontSize: 36, fontWeight: '900', color: '#fff', marginBottom: 16, textAlign: 'center' },
  matchDogsRow:  { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  matchDog:      { fontSize: 56 },
  matchHearts:   { fontSize: 36, marginHorizontal: 2 },
  matchAvatarRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
  matchAvatar:   { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: Colors.primary },
  matchSub:      { fontSize: 16, color: 'rgba(255,255,255,0.80)', textAlign: 'center', marginBottom: 28 },
  matchBtn:      { backgroundColor: Colors.primary, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 28 },
  matchBtnText:  { color: '#fff', fontWeight: '800', fontSize: 17 },
  matchSecondaryBtn:  { marginTop: 14, paddingHorizontal: 24, paddingVertical: 10 },
  matchSecondaryText: { color: 'rgba(255,255,255,0.75)', fontWeight: '700', fontSize: 15 },
});
