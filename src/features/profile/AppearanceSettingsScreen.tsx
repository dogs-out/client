import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { Colors } from '../../constants/colors';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { appPrefs, useAppPrefs } from '../../utils/appPrefs';

type Props = NativeStackScreenProps<RootStackParamList, 'AppearanceSettings'>;

/**
 * How the app looks, as its own screen.
 *
 * <p>The animation switch used to be a row in Settings, where the label and the
 * switch shared one line. In German at a large system font the label took the
 * whole width and pushed the switch off the screen entirely — reported by a
 * tester who could see the setting but not reach it.
 *
 * <p>A screen rather than a fixed row also leaves room for the background
 * settings still to come.
 */
export default function AppearanceSettingsScreen({ navigation }: Readonly<Props>) {
  const { t } = useTranslation();
  const { freezeBackground } = useAppPrefs();

  return (
    <SafeAreaView style={styles.safe}>
      <FloatingBackground />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('settings.appearance.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <GlassCard>
          {/* Label above the control, not beside it: a row that has to fit both
              on one line is a row that breaks at a large font size. */}
          <View style={styles.settingHead}>
            <View style={styles.iconWrap}>
              <Ionicons name="sparkles-outline" size={18} color={Colors.primary} />
            </View>
            <Text style={styles.settingLabel}>{t('settings.appearance.freezeLabel')}</Text>
          </View>

          <Text style={styles.settingHint}>{t('settings.appearance.freezeHint')}</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchState}>
              {t(freezeBackground ? 'settings.appearance.off' : 'settings.appearance.on')}
            </Text>
            <Switch
              // Reads as "animation on", so the stored "freeze" flag is inverted here.
              value={!freezeBackground}
              onValueChange={on => appPrefs.set('freezeBackground', !on)}
              trackColor={{ false: Colors.border, true: Colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </GlassCard>

        <Text style={styles.footNote}>{t('settings.appearance.footNote')}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.text },

  body: { paddingHorizontal: 20 },

  settingHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(46,158,107,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  // flexShrink so a long translation wraps instead of pushing anything sideways.
  settingLabel: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  settingHint:  { fontSize: 13, color: Colors.textSecondary, lineHeight: 19, marginTop: 10 },

  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border,
  },
  switchState: { flex: 1, marginRight: 12, fontSize: 15, fontWeight: '600', color: Colors.text },

  footNote: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginTop: 14, paddingHorizontal: 4 },
});
