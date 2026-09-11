import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';
import { GlassCard } from './GlassCard';

/** Zürcher Tierschutz — the shelter the adopt button points at until the feature exists. */
const SHELTER_URL = 'https://www.zuerchertierschutz.ch';

/**
 * Shown where a feature needs a dog and the account has none.
 *
 * <p>The tab stays in place rather than disappearing: a feature that vanishes
 * looks like a bug, and someone who has just removed their last dog has no way to
 * find out why the app changed shape. This says what is missing and offers the two
 * ways out — one of which is the adoption idea, standing in for itself until the
 * feature lands.
 */
export function NeedsDogNotice({ reason, onAddDog }: Readonly<{
  /** Which feature is asking — 'discover' or 'playdates'. */
  reason: 'discover' | 'playdates';
  onAddDog: () => void;
}>) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>🐾</Text>
      <Text style={styles.title}>{t(`needsDog.${reason}.title`)}</Text>
      <Text style={styles.body}>{t(`needsDog.${reason}.body`)}</Text>

      <TouchableOpacity style={styles.primary} onPress={onAddDog} activeOpacity={0.8}>
        <Ionicons name="add-circle-outline" size={18} color="#fff" />
        <Text style={styles.primaryText}>{t('needsDog.addDog')}</Text>
      </TouchableOpacity>

      <GlassCard style={styles.adoptCard} padding={16}>
        <Text style={styles.adoptLabel}>{t('needsDog.adoptTitle')}</Text>
        <Text style={styles.adoptSoon}>{t('needsDog.adoptSoon')}</Text>
        <TouchableOpacity
          style={styles.secondary}
          onPress={() => Linking.openURL(SHELTER_URL)}
          activeOpacity={0.8}
        >
          <Ionicons name="heart-outline" size={17} color={Colors.primary} />
          <Text style={styles.secondaryText}>{t('needsDog.adoptDog')}</Text>
          <Ionicons name="open-outline" size={14} color={Colors.textSecondary} />
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 40 },
  emoji: { fontSize: 52, marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  body:  { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 22 },

  primary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 24,
    paddingVertical: 13, paddingHorizontal: 26, minWidth: 220,
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  adoptCard:  { marginTop: 22, width: '100%' },
  adoptLabel: { fontSize: 14, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  adoptSoon:  { fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 2, marginBottom: 12 },
  secondary: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    borderRadius: 20, borderWidth: 1.5, borderColor: Colors.primary, paddingVertical: 10,
  },
  secondaryText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
});
