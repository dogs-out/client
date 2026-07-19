import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';

type Props = NativeStackScreenProps<RootStackParamList, 'HelpFaq'>;

const FAQ_KEYS = ['matching', 'discoverEmpty', 'editDogs', 'reportBlock', 'privateMessages', 'deleteAccount'] as const;

export default function HelpFaqScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.helpFaq.headerTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {FAQ_KEYS.map((key, i) => {
          const expanded = open === i;
          return (
            <GlassCard key={key} padding={0} style={styles.card}>
              <TouchableOpacity style={styles.question} onPress={() => setOpen(expanded ? null : i)}>
                <Text style={styles.questionText}>{t(`profile.helpFaq.${key}.q`)}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
              {expanded && <Text style={styles.answer}>{t(`profile.helpFaq.${key}.a`)}</Text>}
            </GlassCard>
          );
        })}

        <Text style={styles.contact}>
          {t('profile.helpFaq.contact')}
        </Text>
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  card:   { marginBottom: 12 },

  question:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  questionText: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.text },
  answer:       { paddingHorizontal: 16, paddingBottom: 14, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  contact: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginTop: 8 },
});
