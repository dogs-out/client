import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, NativeScrollEvent, NativeSyntheticEvent,
  StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { userService } from '../../services/userService';
import { appPrefs } from '../../utils/appPrefs';
import { TourSlide, tourSlides, tourVariant } from './tourSlides';
import { tourProgress } from './tourProgress';

type Props = NativeStackScreenProps<RootStackParamList, 'Tour'>;

/**
 * The app tour: a few swipeable slides on what this person can do here.
 *
 * <p>The app has grown well past what anyone discovers unaided — playdates, the
 * walking status, walks from a chat, dogsitting, SOS — and each account type
 * uses a different half of it, so the tour is picked by role.
 */
export default function TourScreen({ navigation, route }: Readonly<Props>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const startAt = route.params?.startAt ?? 0;
  const [slides, setSlides] = useState<TourSlide[] | null>(null);
  const [index, setIndex] = useState(startAt);
  const listRef = useRef<FlatList<TourSlide>>(null);

  useEffect(() => {
    userService.getMe()
      .then(me => setSlides(tourSlides(tourVariant(me))))
      .catch(() => setSlides(tourSlides('owner')));
    // Seen once it has opened, not once it is finished: someone who backgrounds
    // the app halfway through has seen enough not to be shown it again.
    appPrefs.set('tourSeen', true);
    // Back in the tour, so the "continue" bar has done its job.
    tourProgress.clear();
  }, []);

  const finish = () => navigation.goBack();

  /**
   * Opens the real screen for this slide, leaving a bar there to come back to the
   * tour at the next slide — so each feature can be looked at in place without
   * starting the tour over.
   */
  const showMe = (slide: TourSlide) => {
    if (!slide.target || !slides) return;
    const target = slide.target;
    tourProgress.pause(Math.min(index + 1, slides.length - 1));
    navigation.goBack();
    if ('tab' in target) navigation.navigate('MainTabs', { screen: target.tab } as never);
    else if (target.screen === 'AddDog') navigation.navigate('AddDog', {});
    else navigation.navigate(target.screen);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  const next = () => {
    if (!slides) return;
    if (index >= slides.length - 1) { finish(); return; }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const last = slides != null && index >= slides.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.top}>
        {!last && (
          <TouchableOpacity onPress={finish} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.skip}>{t('tour.skip')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {slides === null ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          ref={listRef}
          data={slides}
          keyExtractor={s => s.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          initialScrollIndex={Math.min(startAt, slides.length - 1)}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <GlassCard style={styles.art} radius={90} padding={0}>
                <View style={styles.artInner}><Text style={styles.emoji}>{item.emoji}</Text></View>
              </GlassCard>
              <Text style={styles.title}>{t(`tour.slides.${item.key}.title`)}</Text>
              <Text style={styles.body}>{t(`tour.slides.${item.key}.body`)}</Text>
              {item.target && (
                <TouchableOpacity style={styles.showMe} onPress={() => showMe(item)}>
                  <Text style={styles.showMeText}>{t('tour.showMe')}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {slides && (
        <View style={styles.bottom}>
          <View style={styles.dots}>
            {slides.map((s, i) => <View key={s.key} style={[styles.dot, i === index && styles.dotActive]} />)}
          </View>
          <GlassButton onPress={next} style={styles.button}>
            <Text style={styles.buttonText}>{last ? t('tour.start') : t('tour.next')}</Text>
          </GlassButton>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top:  { height: 44, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 24 },
  skip: { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },

  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36 },
  art:      { width: 180, height: 180, marginBottom: 36 },
  artInner: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 84 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 12 },
  body:  { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 23 },
  showMe: {
    marginTop: 22, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 18,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  showMeText: { fontSize: 15, fontWeight: '800', color: Colors.primary },

  bottom: { paddingHorizontal: 24, paddingBottom: 16, gap: 18 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7 },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { width: 22, backgroundColor: Colors.primary },
  button:     {},
  buttonText: { fontSize: 16, fontWeight: '800', color: Colors.text },
});
