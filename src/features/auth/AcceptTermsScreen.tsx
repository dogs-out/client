import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { userService } from '../../services/userService';
import { getApiError } from '../../utils/apiError';

type Props = NativeStackScreenProps<RootStackParamList, 'AcceptTerms'>;

/** Same sections as the Settings copy — one source of terms, shown twice. */
const SECTION_KEYS = [
  'whoCanUse', 'contentBehaviour', 'meetingInPerson', 'dogsitting',
  'dataStored', 'dataUse', 'deletingData', 'contact',
] as const;

/**
 * The terms, before anything else.
 *
 * <p>No back button and no skip: this is a gate, and a gate with a way round it
 * is decoration. Acceptance is recorded on the account rather than the device, so
 * it survives a reinstall and a second phone — and so there is an answer if
 * anyone ever has to ask when a given user agreed.
 */
export default function AcceptTermsScreen({ navigation, route }: Readonly<Props>) {
  const { t } = useTranslation();
  const [accepting, setAccepting] = useState(false);

  const accept = async () => {
    setAccepting(true);
    try {
      await userService.acceptTerms();
      navigation.reset({ index: 0, routes: [{ name: route.params?.next ?? 'MainTabs' }] });
    } catch (e) {
      Alert.alert(t('common.error'), getApiError(e));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <Text style={styles.title}>{t('auth.acceptTerms.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.acceptTerms.subtitle')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>{t('profile.termsPrivacy.updated')}</Text>
        {SECTION_KEYS.map(key => (
          <GlassCard key={key} padding={0} style={styles.card}>
            <View style={styles.cardInner}>
              <Text style={styles.sectionTitle}>{t(`profile.termsPrivacy.${key}.title`)}</Text>
              <Text style={styles.sectionBody}>{t(`profile.termsPrivacy.${key}.body`)}</Text>
            </View>
          </GlassCard>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <GlassButton onPress={accept} disabled={accepting} style={styles.acceptBtn}>
          {accepting
            ? <ActivityIndicator color={Colors.text} />
            : <Text style={styles.acceptText}>{t('auth.acceptTerms.accept')}</Text>
          }
        </GlassButton>
        <Text style={styles.footNote}>{t('auth.acceptTerms.footNote')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: Colors.background },
  header:   { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
  title:    { fontSize: 26, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, lineHeight: 20 },

  scroll:  { paddingHorizontal: 20, paddingBottom: 16 },
  updated: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12 },
  card:      { marginBottom: 10 },
  cardInner: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  sectionBody:  { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  footer:     { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  acceptBtn:  { marginBottom: 8 },
  acceptText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  footNote:   { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', lineHeight: 16 },
});
