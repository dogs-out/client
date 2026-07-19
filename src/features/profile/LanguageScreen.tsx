import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { Colors } from '../../constants/colors';
import { SUPPORTED_LANGUAGES, setLanguage } from '../../i18n';

type Props = NativeStackScreenProps<RootStackParamList, 'Language'>;

export default function LanguageScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.language.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.content}>
        <GlassCard padding={0}>
          {SUPPORTED_LANGUAGES.map((lang, i) => {
            const active = i18n.language === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[styles.row, i < SUPPORTED_LANGUAGES.length - 1 && styles.rowBorder]}
                onPress={() => setLanguage(lang.code)}
              >
                <Text style={styles.rowLabel}>{lang.label}</Text>
                {active && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </GlassCard>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  content: { padding: 20, paddingTop: 12 },

  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel:  { fontSize: 15, color: Colors.text, fontWeight: '500' },
});
