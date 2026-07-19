import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

export default function AboutScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.about.headerTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <GlassCard>
          <View style={styles.center}>
            <Text style={styles.logo}>🐕</Text>
            <Text style={styles.appName}>Dogs Out</Text>
            <Text style={styles.tagline}>{t('profile.about.tagline')}</Text>
            <Text style={styles.version}>{t('profile.about.version', { version })}</Text>
          </View>
        </GlassCard>

        <Text style={styles.credit}>
          {t('profile.about.credit')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  body:   { paddingHorizontal: 20, paddingTop: 8 },
  center: { alignItems: 'center' },

  logo:    { fontSize: 64, marginBottom: 8 },
  appName: { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  tagline: { fontSize: 14, color: Colors.textSecondary, marginBottom: 12 },
  version: { fontSize: 13, color: Colors.textSecondary },

  credit: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 20, lineHeight: 18 },
});
