import { useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { KEYBOARD_BEHAVIOR } from '../../utils/keyboardBehavior';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { authService } from '../../services/authService';
import { tokenStorage } from '../../utils/tokenStorage';
import { signedInRoute } from '../../utils/signedInRoute';
import { getApiError } from '../../utils/apiError';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export default function VerifyEmailScreen({ route, navigation }: Readonly<Props>) {
  const { t } = useTranslation();
  const { email, name, password } = route.params;
  // Set when the server told us it could not hand the mail to its provider — a
  // silent failure here reads as "the code is taking a while" forever.
  const [deliveryFailed, setDeliveryFailed] = useState(route.params.emailFailed === true);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (entered: string = code) => {
    if (entered.length !== 6) { setError(t('auth.verifyEmail.enterCode')); return; }
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const res = await authService.verifyEmail(email, entered);
      await tokenStorage.set(res.token);
      navigation.reset({ index: 0, routes: [await signedInRoute()] });
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  // The iPhone number pad has no return key and covered the Verify button, so
  // people typed all six digits and were stuck. A complete code now confirms itself.
  const onCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6 && !loading) handleVerify(digits);
  };

  const handleResend = async () => {
    if (!name || !password) { navigation.goBack(); return; }
    setResending(true);
    setError(null);
    try {
      const result = await authService.register(email, name, password);
      setDeliveryFailed(result.emailSent === false);
    } catch {
      // 403 just means the email is already pending — code was resent, that's fine
    } finally {
      setResending(false);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    <View style={styles.screen}>
      <FloatingBackground />
      <KeyboardAvoidingView style={styles.container} behavior={KEYBOARD_BEHAVIOR}>
      <GlassCard style={styles.card}>
        <Text style={styles.title}>{t('auth.verifyEmail.title')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.verifyEmail.subtitle')}{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        {deliveryFailed && (
          <Text style={styles.warning}>{t('auth.verifyEmail.deliveryFailed')}</Text>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor={Colors.textSecondary}
          value={code}
          onChangeText={onCodeChange}
          keyboardType="number-pad"
          // Lets iOS offer the code from the Mail app above the keyboard.
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={6}
          textAlign="center"
          autoFocus
        />

        {loading ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={Colors.primary} />
        ) : (
          <GlassButton onPress={() => handleVerify()} style={styles.button}>
            <Text style={styles.buttonText}>{t('auth.verifyEmail.verify')}</Text>
          </GlassButton>
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.linkButton} onPress={handleResend} disabled={resending}>
            {resending ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={[styles.link, resent && styles.linkSuccess]}>
                {resent ? t('auth.verifyEmail.codeResent') : t('auth.verifyEmail.resend')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
            <Text style={styles.link}>{t('auth.verifyEmail.wrongEmail')}</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
      </KeyboardAvoidingView>
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: Colors.background },
  container:   { flex: 1, padding: 24, justifyContent: 'center' },
  card:        { width: '100%' },
  title:       { fontSize: 26, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  subtitle:    { fontSize: 15, color: Colors.textSecondary, marginBottom: 24, lineHeight: 22 },
  emailText:   { color: Colors.primary, fontWeight: '700' },
  error:       { color: Colors.error, marginBottom: 12, textAlign: 'center', fontSize: 14 },
  warning: { color: Colors.accent, fontSize: 13, textAlign: 'center', marginBottom: 10, lineHeight: 18 },
  input:       { borderWidth: 1.5, borderColor: Colors.glass.inputBorder, borderRadius: 12, padding: 14, fontSize: 28, marginBottom: 16, letterSpacing: 0, color: Colors.text, backgroundColor: Colors.glass.inputBg, textAlign: 'center' },
  button:      { marginBottom: 12 },
  buttonText:  { color: Colors.text, fontSize: 16, fontWeight: '700' },
  footer:      { marginTop: 8, gap: 8 },
  linkButton:  { alignItems: 'center', paddingVertical: 6 },
  link:        { color: Colors.textSecondary, fontSize: 14 },
  linkSuccess: { color: '#48bb78', fontWeight: '600' },
});