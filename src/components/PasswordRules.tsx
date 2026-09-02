import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { passwordRuleStates } from '../utils/passwordRules';
import { Colors } from '../constants/colors';
import { scaledLineHeight } from '../utils/typography';

/**
 * Live checklist of the server's password rules.
 *
 * The rules used to be invisible until the server rejected the form, so people
 * found out what was wrong one attempt at a time. Ticking them off as you type
 * costs nothing and removes the round trip.
 */
export function PasswordRules({ password }: Readonly<{ password: string }>) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t('auth.passwordRules.title')}</Text>
      <View style={styles.grid}>
        {passwordRuleStates(password).map(({ id, met }) => (
          <View key={id} style={styles.row}>
            <Ionicons
              name={met ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={met ? Colors.primary : Colors.textSecondary}
            />
            <Text style={[styles.rule, met && styles.ruleMet]} numberOfLines={2}>
              {t(`auth.passwordRules.${id}`)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { marginBottom: 12 },
  title: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4 },
  // Two columns of short rules: six stacked lines pushes the button off a small
  // screen, and each rule is only a couple of words.
  grid:  { flexDirection: 'row', flexWrap: 'wrap' },
  row:   { flexDirection: 'row', alignItems: 'center', gap: 5, width: '50%', paddingVertical: 2 },
  rule:  { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: scaledLineHeight(16) },
  ruleMet: { color: Colors.primary, fontWeight: '600' },
});
