import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { authService } from '../../services/authService';
import { getApiError } from '../../utils/apiError';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name || !email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.register(email, name, password);
      navigation.navigate('VerifyEmail', { email });
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Join the Dogs Out community</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} autoComplete="name" />
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
  button: { backgroundColor: '#111', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 4, marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 12, alignItems: 'center' },
  link: { color: '#666', fontSize: 14 },
  linkBold: { color: '#111', fontWeight: '600' },
});