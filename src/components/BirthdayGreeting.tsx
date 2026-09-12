import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';
import { FloatingBackground } from './FloatingBackground';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { appPrefs, useAppPrefs } from '../utils/appPrefs';
import { useCelebration } from '../utils/celebration';

/**
 * A greeting on the day, shown once.
 *
 * <p>"Once" is per calendar year and per device, kept in the local preferences:
 * the app is opened several times a day, and a message that reappears every time
 * stops being a nice moment by lunchtime. It deliberately does not live on the
 * server — being greeted twice after reinstalling on your birthday is a far
 * smaller problem than a round trip on every launch.
 *
 * <p>Mounted above the navigator so it finds the user wherever they happen to be.
 */
export function BirthdayGreeting() {
  const { t } = useTranslation();
  const { own, dogNames } = useCelebration();
  const { birthdayGreetedYear } = useAppPrefs();
  const [dismissed, setDismissed] = useState(false);
  // Whether this mount decided to greet. Deliberately not derived from the stored
  // year: stamping the year is what stops it coming back, so a visibility rule
  // that reads the same value would hide the greeting in the very render that
  // recorded it — a popup that flashes and vanishes.
  const [greeting, setGreeting] = useState(false);

  const year = new Date().getFullYear();
  const celebrating = own || dogNames.length > 0;

  useEffect(() => {
    if (!celebrating || birthdayGreetedYear === year || greeting) return;
    // Recorded as it opens rather than when it is closed, so a greeting
    // interrupted by a backgrounded app does not come back.
    setGreeting(true);
    appPrefs.set('birthdayGreetedYear', year);
  }, [celebrating, birthdayGreetedYear, year, greeting]);

  if (!greeting || dismissed) return null;

  const dogs = dogNames.join(' & ');
  let title: string;
  let body: string;

  if (own && dogNames.length > 0) {
    // Sharing a birthday with your own dog deserves saying out loud.
    title = t('birthday.bothTitle', { dog: dogs });
    body = t('birthday.bothBody', { dog: dogs });
  } else if (own) {
    title = t('birthday.ownTitle');
    body = t('birthday.ownBody');
  } else {
    title = t('birthday.dogTitle', { dog: dogs });
    body = t('birthday.dogBody', { dog: dogs });
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => setDismissed(true)}>
      <View style={styles.backdrop}>
        {/* The same drifting cakes and confetti as the screens behind it. */}
        <FloatingBackground variant="birthday" />

        <GlassCard style={styles.card}>
          <Text style={styles.cake}>🎂</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
          <Text style={styles.signoff}>{t('birthday.signoff')}</Text>

          <GlassButton onPress={() => setDismissed(true)} style={styles.button}>
            <Text style={styles.buttonText}>{t('birthday.thanks')}</Text>
          </GlassButton>
        </GlassCard>

        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setDismissed(true)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, backgroundColor: 'rgba(12,30,22,0.55)',
  },
  // Above the dismiss-on-tap layer behind it.
  card: { alignItems: 'center', paddingVertical: 26, paddingHorizontal: 22, zIndex: 1 },
  cake:  { fontSize: 54, marginBottom: 10 },
  title: { fontSize: 21, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  body:  { fontSize: 15, color: Colors.text, textAlign: 'center', lineHeight: 22, marginTop: 10 },
  signoff: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 14 },
  button: { marginTop: 20, alignSelf: 'stretch' },
  buttonText: { color: Colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
