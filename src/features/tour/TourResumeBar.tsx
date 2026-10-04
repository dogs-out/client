import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { tourProgress, useTourResumeAt } from './tourProgress';

interface Props {
  onContinue: (startAt: number) => void;
}

/**
 * Floats over whatever screen "Show me" opened: a way back into the tour where it
 * left off, or out of it. Rendered at the root so it follows the user around the
 * app while they look.
 */
export function TourResumeBar({ onContinue }: Readonly<Props>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const resumeAt = useTourResumeAt();
  if (resumeAt === null) return null;

  return (
    // Above the floating tab bar, so it never covers the tab it is showing off.
    <View style={[styles.wrap, { bottom: insets.bottom + 96 }]} pointerEvents="box-none">
      <View style={styles.bar}>
        <TouchableOpacity onPress={() => tourProgress.clear()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skip}>{t('tour.skip')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.continue} onPress={() => onContinue(resumeAt)}>
          <Text style={styles.continueText}>{t('tour.continue')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 18,
    backgroundColor: Colors.text, borderRadius: 22,
    paddingLeft: 20, paddingRight: 6, paddingVertical: 6,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  skip:         { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '700' },
  continue:     { backgroundColor: Colors.primary, borderRadius: 17, paddingHorizontal: 16, paddingVertical: 10 },
  continueText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
