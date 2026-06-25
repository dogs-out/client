import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { authService } from '../../services/authService';
import { getApiError } from '../../utils/apiError';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

interface Strength { level: 0 | 1 | 2 | 3; label: string; color: string; }

function getPasswordStrength(pwd: string): Strength {
  if (!pwd) return { level: 0, label: '', color: '#e0e0e0' };
  const hasLetters = /[a-zA-Z]/.test(pwd);
  const hasNumbers = /[0-9]/.test(pwd);
  const hasSymbols = /[^a-zA-Z0-9]/.test(pwd);
  const types = [hasLetters, hasNumbers, hasSymbols].filter(Boolean).length;
  if (pwd.length < 8 || types < 2) return { level: 1, label: 'Weak',   color: '#e53e3e' };
  if (types < 3 && pwd.length < 12) return { level: 2, label: 'OK',     color: '#ecc94b' };
  return                                    { level: 3, label: 'Strong', color: '#48bb78' };
}

export default function ResetPasswordScreen({ navigation }: Props) {
  const [token, setToken]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const strength = getPasswordStrength(password);

  const handleReset = async () => {
    if (!token.trim())        { setError('Please paste the token from your email.'); return; }
    if (strength.level < 2)   { setError('Please choose a stronger password (8+ chars with letters and numbers).'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword(token.trim(), password);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e) {
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
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>Paste the token from your email, then choose a new password.</Text>

          {error && <Text style={styles.error}>{error}</Text>}

          <TextInput
            style={styles.input}
            placeholder="Token from email"
            placeholderTextColor={Colors.textSecondary}
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={Colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          {password.length > 0 && (
            <View style={styles.strengthRow}>
              {([1, 2, 3] as const).map(lvl => (
                <View
                  key={lvl}
                  style={[styles.strengthBar, { backgroundColor: strength.level >= lvl ? strength.color : '#e0e0e0' }]}
                />
              ))}
              <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={Colors.textSecondary}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            autoComplete="new-password"
          />

          {loading ? (
            <ActivityIndicator style={{ marginTop: 16 }} color={Colors.primary} />
          ) : (
            <GlassButton onPress={handleReset} style={styles.button}>
              <Text style={styles.buttonText}>Set new password</Text>
            </GlassButton>
          )}

          <GlassButton onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </GlassButton>
        </GlassCard>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: Colors.background },
  container:      { flex: 1, padding: 24, justifyContent: 'center' },
  card:           { width: '100%' },
  title:          { fontSize: 26, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  subtitle:       { fontSize: 15, color: Colors.textSecondary, marginBottom: 24, lineHeight: 22 },
  error:          { color: Colors.error, marginBottom: 12, textAlign: 'center', fontSize: 14 },
  input:          { borderWidth: 1.5, borderColor: Colors.glass.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12, color: Colors.text, backgroundColor: Colors.glass.inputBg, letterSpacing: 0 },
  strengthRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  strengthBar:    { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel:  { fontSize: 12, fontWeight: '600', width: 52 },
  button:         { marginBottom: 10 },
  buttonText:     { color: Colors.text, fontSize: 16, fontWeight: '700' },
  backButton:     { },
  backText:       { color: Colors.textSecondary, fontSize: 15 },
});