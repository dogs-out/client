import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { SosBanner } from '../sos/SosBanner';
import FindSitterScreen from '../sitter/FindSitterScreen';
import { MarketplaceSection } from '../market/MarketplaceSection';
import { SchoolsSection } from '../school/SchoolsSection';

type Section = 'sitting' | 'market' | 'schools';
const SECTIONS: Section[] = ['sitting', 'market', 'schools'];

/**
 * The Community tab: dogsitting, the marketplace and dog schools under one
 * tab rather than a sixth one, which no longer fits on a small phone.
 */
export default function CommunityScreen() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>('sitting');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FloatingBackground />
      <View style={styles.header}>
        <Text style={styles.title}>{t('community.title')}</Text>
      </View>
      <SosBanner />
      {/* The same segmented bar as the Playdates tab. */}
      <View style={styles.segmented}>
        {SECTIONS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.segment, section === s && styles.segmentActive]}
            onPress={() => setSection(s)}
            testID={`community-${s}`}
          >
            <Text
              style={[styles.segmentText, section === s && styles.segmentTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.2}
            >
              {t(`community.${s}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {section === 'sitting' && <FindSitterScreen embedded />}
      {section === 'market' && <MarketplaceSection />}
      {section === 'schools' && <SchoolsSection />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  // Header and segmented bar exactly as in PlaydatesScreen.
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title:  { fontSize: 28, fontWeight: '800', color: Colors.text },
  segmented: {
    flexDirection: 'row', marginHorizontal: 20, marginBottom: 10,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden',
  },
  segment:           { flex: 1, paddingVertical: 9, paddingHorizontal: 6, alignItems: 'center' },
  segmentActive:     { backgroundColor: 'rgba(46,158,107,0.12)' },
  segmentText:       { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  segmentTextActive: { color: Colors.primary },
});
