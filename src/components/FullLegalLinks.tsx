import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Colors } from '../constants/colors';

/**
 * Links to the full Terms of Use and Privacy Policy on the website. The in-app
 * text is a summary; these are what applies — in German the binding original,
 * otherwise the English version.
 */
export function FullLegalLinks() {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      {(['Terms', 'Privacy'] as const).map(kind => (
        <TouchableOpacity
          key={kind}
          style={styles.link}
          onPress={() => WebBrowser.openBrowserAsync(t(`profile.termsPrivacy.${kind === 'Terms' ? 'termsUrl' : 'privacyUrl'}`))}
        >
          <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
          <Text style={styles.text}>{t(`profile.termsPrivacy.full${kind}`)}</Text>
          <Ionicons name="open-outline" size={14} color={Colors.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 4, marginBottom: 12 },
  link: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: 'rgba(46,158,107,0.06)',
  },
  text: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.primary },
});
