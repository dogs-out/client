import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { AxiosError } from 'axios';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { authService } from '../../services/authService';
import { getApiError } from '../../utils/apiError';
import { FloatingBackground } from '../../components/FloatingBackground';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

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

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = getPasswordStrength(password);

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.'); return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.'); return;
    }
    if (strength.level < 2) {
      setError('Please choose a stronger password (8+ chars with letters and numbers).'); return;
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FloatingBackground />
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Join the Dogs Out community</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
        autoComplete="name"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
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
          <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Confirm password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="new-password"
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Register</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, color: '#111' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  error: { color: '#e53e3e', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 12, color: '#111' },
  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  strengthBar: { flex: 1, height: 4, borderRadius: 2 },
  strengthLabel: { fontSize: 12, fontWeight: '600', width: 52 },
  button: { backgroundColor: '#111', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 4, marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 12, alignItems: 'center' },
  link: { color: '#666', fontSize: 14 },
  linkBold: { color: '#111', fontWeight: '600' },
});