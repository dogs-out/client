import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsPrivacy'>;

const SECTION_KEYS = ['whoCanUse', 'contentBehaviour', 'meetingInPerson', 'dataStored', 'dataUse', 'deletingData', 'contact'] as const;

export default function TermsPrivacyScreen({ navigation }: Props) {
  const { t } = useTranslation();
  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.termsPrivacy.headerTitle')}</Text>
        <View style={{ width: 26 }} />
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
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  scroll:  { paddingHorizontal: 20, paddingTop: 4 },
  updated: { fontSize: 12, color: Colors.textSecondary, marginBottom: 12, marginLeft: 4 },
  card:    { marginBottom: 12 },
  cardInner: { paddingHorizontal: 16, paddingVertical: 14 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  sectionBody:  { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
});
