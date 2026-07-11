import { useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { userService } from '../../services/userService';
import { notificationService } from '../../services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'NotificationSettings'>;

export default function NotificationSettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    userService.getMe()
      .then(u => setEnabled(u.notificationsEnabled))
      .catch(() => setEnabled(true));
  }, []);

  const toggle = (value: boolean) => {
    setEnabled(value); // optimistic
    setError(null);
    notificationService.setEnabled(value)
      .then(() => { if (value) notificationService.register(); })
      .catch(() => {
        setEnabled(!value);
        setError(t('profile.notificationSettings.saveError'));
      });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.rows.notifications')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <GlassCard padding={0}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{t('profile.notificationSettings.pushNotifications')}</Text>
              <Text style={styles.rowSub}>{t('profile.notificationSettings.pushNotificationsSub')}</Text>
            </View>
            <Switch
              value={enabled ?? true}
              onValueChange={toggle}
              disabled={enabled === null}
              trackColor={{ true: Colors.primary }}
            />
          </View>
        </GlassCard>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Text style={styles.hint}>
          {t('profile.notificationSettings.hint')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  body: { paddingHorizontal: 20, paddingTop: 8 },

  row:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowText:  { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  rowSub:   { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  errorText: { color: Colors.error, fontSize: 13, marginTop: 12, textAlign: 'center' },
  hint:      { fontSize: 13, color: Colors.textSecondary, marginTop: 16, marginHorizontal: 4, lineHeight: 18 },
});
