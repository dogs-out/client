import { useCallback, useEffect, useState } from 'react';
import { AppState, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';
import { RootStackParamList } from '../types/navigation';
import { DailyDigest, dailyService } from '../services/dailyService';
import { appPrefs } from '../utils/appPrefs';
import { userService } from '../services/userService';
import { usePopupGateBusy } from '../utils/popupGate';

type Card = { emoji: string; title: string; body: string; action: string; go: 'Discover' | 'CreatePlaydate' };

/** The one thing worth saying today, in the same order as the daily push. */
export function pickCard(d: DailyDigest, t: (key: string, o?: Record<string, unknown>) => string): Card | null {
  const bones = d.bones.remaining;
  if (d.newNearby > 0) {
    return {
      emoji: '🐾',
      title: t('daily.newNearbyTitle', { count: d.newNearby }),
      body: t('daily.newNearbyBody', { count: bones }),
      action: t('daily.goSwipe'),
      go: 'Discover',
    };
  }
  if (d.deckSize > 0 && bones > 0) {
    return {
      emoji: '🦴',
      title: t('daily.bonesTitle', { count: bones }),
      body: t('daily.bonesBody', { count: d.deckSize }),
      action: t('daily.goSwipe'),
      go: 'Discover',
    };
  }
  if (d.canHost) {
    return { emoji: '🌳', title: t('daily.playdateTitle'), body: t('daily.playdateBody'), action: t('daily.goPlaydate'), go: 'CreatePlaydate' };
  }
  return null;
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * A card once a day when the app opens: new dog owners nearby, bones ready, or a
 * playdate to plan. Once per device per day, and never on top of another pop-up.
 *
 * <p>Mounted with the main tabs, so it only runs for a signed-in user.
 */
export function DailyCard() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const busy = usePopupGateBusy();
  const [card, setCard] = useState<Card | null>(null);

  const check = useCallback(async () => {
    await appPrefs.load();
    // Admins see it on every start, to check how it looks; everyone else once a day.
    const admin = await userService.getMe().then(me => me.role === 'ADMIN').catch(() => false);
    if (!admin && appPrefs.get().dailyCardDay === today()) return;
    const digest = await dailyService.today().catch(() => null);
    if (!digest) return;
    // An admin with nothing new still gets a card to look at.
    const next = pickCard(digest, t) ?? (admin ? pickCard({ ...digest, canHost: true }, t) : null);
    if (next) setCard(next);
  }, [t]);

  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', s => { if (s === 'active') check(); });
    return () => sub.remove();
  }, [check]);

  const visible = card !== null && !busy;
  // Recorded once it is actually on screen, not when it was fetched.
  useEffect(() => { if (visible) appPrefs.set('dailyCardDay', today()); }, [visible]);

  if (!card) return null;

  const close = () => setCard(null);
  const go = () => {
    const target = card.go;
    close();
    if (target === 'CreatePlaydate') navigation.navigate('CreatePlaydate', undefined);
    else navigation.navigate('MainTabs', { screen: 'Discover' } as never);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      {/* A solid white card: glass over a dimmed screen read as a grey smudge. */}
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={close} activeOpacity={1} />
        <View style={styles.card}>
          <Text style={styles.emoji}>{card.emoji}</Text>
          <Text style={styles.title}>{card.title}</Text>
          <Text style={styles.body}>{card.body}</Text>
          <TouchableOpacity onPress={go} style={styles.button} activeOpacity={0.8} testID="daily-go">
            <Text style={styles.buttonText}>{card.action}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={close} style={styles.later} testID="daily-later">
            <Text style={styles.laterText}>{t('daily.later')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, backgroundColor: 'rgba(13,40,24,0.35)',
  },
  card: {
    alignSelf: 'stretch', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 26,
    paddingTop: 30, paddingBottom: 18, paddingHorizontal: 24,
    shadowColor: '#0D2818', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  emoji: { fontSize: 50, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  body:  { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  button: {
    alignSelf: 'stretch', alignItems: 'center', marginTop: 22,
    backgroundColor: Colors.primary, borderRadius: 24, paddingVertical: 14,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  later: { marginTop: 12, paddingVertical: 6 },
  laterText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' },
});
