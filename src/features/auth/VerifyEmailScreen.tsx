import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { authService } from '../../services/authService';
import { tokenStorage } from '../../utils/tokenStorage';
import { getApiError } from '../../utils/apiError';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export default function VerifyEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (code.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await authService.verifyEmail(email, code);
      await tokenStorage.set(res.token);
      navigation.reset({ index: 0, routes: [{ name: res.isNewUser ? 'ProfileSetup' : 'Home' }] });
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.subtitle}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.emailText}>{email}</Text>
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <TextInput
        style={styles.input}
        placeholder="000000"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        textAlign="center"
        autoFocus
      />

      {loading ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleVerify}>
          <Text style={styles.buttonText}>Verify</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Wrong email? Go back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8, color: '#111' },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32, lineHeight: 24 },
  emailText: { color: '#111', fontWeight: '600' },
  error: { color: '#e53e3e', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 14, fontSize: 28, marginBottom: 16, letterSpacing: 8, color: '#111' },
  button: { backgroundColor: '#111', padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 12, alignItems: 'center' },
  link: { color: '#666', fontSize: 14 },
});