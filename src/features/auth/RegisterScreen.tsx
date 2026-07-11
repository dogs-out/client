import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { AxiosError } from 'axios';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { authService } from '../../services/authService';
import { getApiError } from '../../utils/apiError';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

interface Strength { level: 0 | 1 | 2 | 3; color: string; }

function getPasswordStrength(pwd: string): Strength {
  if (!pwd) return { level: 0, color: '#e0e0e0' };
  const hasLetters = /[a-zA-Z]/.test(pwd);
  const hasNumbers = /[0-9]/.test(pwd);
  const hasSymbols = /[^a-zA-Z0-9]/.test(pwd);
  const types = [hasLetters, hasNumbers, hasSymbols].filter(Boolean).length;
  if (pwd.length < 8 || types < 2) return { level: 1, color: '#e53e3e' };
  if (types < 3 && pwd.length < 12) return { level: 2, color: '#ecc94b' };
  return                                    { level: 3, color: '#48bb78' };
}

export default function RegisterScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(route.params?.prefillEmail ?? '');
  const [password, setPassword] = useState(route.params?.prefillPassword ?? '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = getPasswordStrength(password);
  const strengthLabels = { 0: '', 1: t('auth.register.weak'), 2: t('auth.register.ok'), 3: t('auth.register.strong') };

  const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'\-]+$/;

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError(t('auth.fillAllFields')); return;
    }
    if (!NAME_REGEX.test(name.trim())) {
      setError(t('auth.register.invalidName')); return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.register.passwordMismatch')); return;
    }
    if (strength.level < 2) {
      setError(t('auth.register.passwordTooWeak')); return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.register(email, name, password);
      navigation.navigate('VerifyEmail', { email, name, password });
    } catch (e) {
      // 403 means the email exists but is unverified — just go straight to VerifyEmail
      if (e instanceof AxiosError && e.response?.status === 403) {
        navigation.navigate('VerifyEmail', { email, name, password });
        return;
      }
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <FloatingBackground />
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <GlassCard style={styles.card}>
      <Text style={styles.title}>{t('auth.register.title')}</Text>
      <Text style={styles.subtitle}>{t('auth.register.subtitle')}</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder={t('auth.register.namePlaceholder')}
        value={name}
        onChangeText={setName}
        autoComplete="name"
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.login.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextInput
        style={styles.input}
        placeholder={t('auth.login.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />

      {password.length > 0 && (
        <View style={styles.strengthRow}>
          {[1, 2, 3].map(lvl => (
            <View
              key={lvl}
              style={[styles.strengthBar, { backgroundColor: strength.level >= lvl ? strength.color : '#e0e0e0' }]}
            />
          ))}
          <Text style={[styles.strengthLabel, { color: strength.color }]}>{strengthLabels[strength.level]}</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder={t('auth.register.confirmPasswordPlaceholder')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="new-password"
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} color={Colors.primary} />
      ) : (
        <GlassButton onPress={handleRegister} style={styles.button}>
          <Text style={styles.buttonText}>{t('auth.register.register')}</Text>
        </GlassButton>
      )}

      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>{t('auth.register.haveAccount')} <Text style={styles.linkBold}>{t('auth.register.signIn')}</Text></Text>
      </TouchableOpacity>
      </GlassCard>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: Colors.background },
  container:    { flex: 1, padding: 24, justifyContent: 'center' },
  card:         { width: '100%' },
  title:        { fontSize: 26, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  subtitle:     { fontSize: 15, color: Colors.textSecondary, marginBottom: 24 },
  error:        { color: Colors.error, marginBottom: 12, textAlign: 'center', fontSize: 14 },
  input:        { borderWidth: 1.5, borderColor: Colors.glass.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12, color: Colors.text, backgroundColor: Colors.glass.inputBg, letterSpacing: 0 },
  strengthRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  strengthBar:  { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel:{ fontSize: 12, fontWeight: '600', width: 52 },
  button:       { marginTop: 4, marginBottom: 12 },
  buttonText:   { color: Colors.text, fontSize: 16, fontWeight: '700' },
  linkButton:   { marginTop: 8, alignItems: 'center' },
  link:         { color: Colors.textSecondary, fontSize: 14 },
  linkBold:     { color: Colors.primary, fontWeight: '700' },
});