import { useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { Colors } from '../../constants/colors';
import { tokenStorage } from '../../utils/tokenStorage';
import { userService } from '../../services/userService';
import { notificationService } from '../../services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

type SettingsRow = {
  icon: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

export default function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [isLocalAuth, setIsLocalAuth] = useState(true);

  useEffect(() => {
    userService.getMe()
      .then(u => setIsLocalAuth(u.authProvider !== 'GOOGLE' && u.authProvider !== 'APPLE'))
      .catch(() => {});
  }, []);

  const handleSignOut = () => {
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOutTitle'), style: 'destructive',
        onPress: async () => {
          await notificationService.unregister(); // stop pushes to this device
          await tokenStorage.remove();
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const sections: { title: string; rows: SettingsRow[] }[] = [
    {
      title: t('settings.sections.discover'),
      rows: [
        { icon: 'options-outline', label: t('settings.rows.discoveryPreferences'), onPress: () => navigation.navigate('DiscoverFilters') },
      ],
    },
    {
      title: t('settings.sections.account'),
      rows: [
        { icon: 'person-outline',        label: t('settings.rows.editProfile'),        onPress: () => navigation.navigate('EditProfile') },
        ...(isLocalAuth ? [{ icon: 'lock-closed-outline', label: t('settings.rows.changePassword'), onPress: () => navigation.navigate('ChangePassword') }] : []),
        { icon: 'notifications-outline', label: t('settings.rows.notifications'),       onPress: () => navigation.navigate('NotificationSettings') },
        { icon: 'language-outline',      label: t('settings.language.title'),            onPress: () => navigation.navigate('Language') },
      ],
    },
    {
      title: t('settings.sections.privacy'),
      rows: [
        { icon: 'location-outline',      label: t('settings.rows.locationSettings'),   onPress: () => navigation.navigate('LocationSettings') },
        { icon: 'eye-off-outline',        label: t('settings.rows.blockedUsers'),       onPress: () => navigation.navigate('BlockedUsers') },
      ],
    },
    {
      title: t('settings.sections.support'),
      rows: [
        { icon: 'chatbubble-ellipses-outline', label: t('settings.rows.sendFeedback'), onPress: () => navigation.navigate('Feedback') },
        { icon: 'help-circle-outline',   label: t('settings.rows.helpFaq'),          onPress: () => navigation.navigate('HelpFaq') },
        { icon: 'document-text-outline', label: t('settings.rows.termsPrivacy'),     onPress: () => navigation.navigate('TermsPrivacy') },
        { icon: 'information-circle-outline', label: t('settings.rows.aboutDogsOut'), onPress: () => navigation.navigate('About') },
      ],
    },
    {
      title: t('settings.sections.dangerZone'),
      rows: [
        { icon: 'log-out-outline', label: t('settings.signOutTitle'), destructive: true, onPress: handleSignOut },
        {
          icon: 'trash-outline', label: t('settings.rows.deleteAccount'), destructive: true,
          onPress: () => Alert.alert(
            t('settings.deleteAccountTitle'),
            t('settings.deleteAccountMessage'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('settings.deleteForever'), style: 'destructive',
                onPress: async () => {
                  try {
                    await userService.deleteAccount();
                    await tokenStorage.remove();
                    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
                  } catch {
                    Alert.alert(t('common.error'), t('settings.deleteAccountError'));
                  }
                },
              },
            ]
          ),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />
      <View style={styles.dimOverlay} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.headerTitle')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <GlassCard padding={0}>
              {section.rows.map((row, i) => (
                <TouchableOpacity
                  key={row.label}
                  style={[styles.row, i < section.rows.length - 1 && styles.rowBorder]}
                  onPress={row.onPress}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.iconWrap, row.destructive && styles.iconWrapDestructive]}>
                      <Ionicons
                        name={row.icon as any}
                        size={18}
                        color={row.destructive ? Colors.error : Colors.primary}
                      />
                    </View>
                    <Text style={[styles.rowLabel, row.destructive && styles.rowLabelDestructive]}>
                      {row.label}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              ))}
            </GlassCard>
          </View>
        ))}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.background },
  dimOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(238,251,243,0.60)', pointerEvents: 'none' },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  headerTitle:{ fontSize: 16, fontWeight: '700', color: Colors.text },
  scroll:     { padding: 20, paddingTop: 12 },

  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4 },

  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:  { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(46,158,107,0.10)', alignItems: 'center', justifyContent: 'center' },
  iconWrapDestructive: { backgroundColor: 'rgba(229,62,62,0.10)' },
  rowLabel:  { fontSize: 15, color: Colors.text, fontWeight: '500' },
  rowLabelDestructive: { color: Colors.error },
});
