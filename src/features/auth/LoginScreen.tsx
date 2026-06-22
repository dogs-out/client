import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { authService } from '../../services/authService';
import { tokenStorage } from '../../utils/tokenStorage';
import { getApiError } from '../../utils/apiError';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await authService.login(email, password);
      await tokenStorage.set(res.token);
      navigation.reset({ index: 0, routes: [{ name: res.isNewUser ? 'ProfileSetup' : 'Home' }] });
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>Dogs Out</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>

      {error && <Text style={styles.error}>{error}</Text>}

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
        autoComplete="password"
      />

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgotPassword}>Forgot password?</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleLogin}>
          <Text style={styles.buttonText}>Sign in</Text>
        </TouchableOpacity>
      )}

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.divider} />
      </View>

      <TouchableOpacity
        style={[styles.button, styles.googleButton]}
        onPress={() => navigation.navigate('GoogleOAuth')}
      >
        <Text style={styles.buttonText}>Sign in with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Don't have an account? <Text style={styles.linkBold}>Register</Text></Text>
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
  forgotPassword: { color: '#666', textAlign: 'right', marginBottom: 20, fontSize: 14 },
  button: { backgroundColor: '#111', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  googleButton: { backgroundColor: '#4285F4' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  divider: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { marginHorizontal: 12, color: '#999', fontSize: 14 },
  linkButton: { marginTop: 12, alignItems: 'center' },
  link: { color: '#666', fontSize: 14 },
  linkBold: { color: '#111', fontWeight: '600' },
});