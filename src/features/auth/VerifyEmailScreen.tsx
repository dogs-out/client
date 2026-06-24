import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { authService } from '../../services/authService';
import { tokenStorage } from '../../utils/tokenStorage';
import { getApiError } from '../../utils/apiError';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

export default function VerifyEmailScreen({ route, navigation }: Props) {
  const { email, name, password } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
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

  const handleResend = async () => {
    if (!name || !password) { navigation.goBack(); return; }
    setResending(true);
    setError(null);
    try {
      await authService.register(email, name, password);
    } catch {
      // 403 just means the email is already pending — code was resent, that's fine
    } finally {
      setResending(false);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    }
  };

  return (
    <View style={styles.screen}>
      <FloatingBackground />
      <View style={styles.container}>
      <GlassCard style={styles.card}>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="000000"
          placeholderTextColor={Colors.textSecondary}
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
          autoFocus
        />

        {loading ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={Colors.primary} />
        ) : (
          <GlassButton onPress={handleVerify} style={styles.button}>
            <Text style={styles.buttonText}>Verify</Text>
          </GlassButton>
        )}

        <View style={styles.footer}>
          <TouchableOpacity style={styles.linkButton} onPress={handleResend} disabled={resending}>
            {resending ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Text style={[styles.link, resent && styles.linkSuccess]}>
                {resent ? 'Code resent — check your inbox' : "Didn't get the code? Resend"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Wrong email? Go back</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
      </View>
    </View>
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
  input:       { borderWidth: 1.5, borderColor: Colors.glass.inputBorder, borderRadius: 12, padding: 14, fontSize: 28, marginBottom: 16, letterSpacing: 0, color: Colors.text, backgroundColor: Colors.glass.inputBg, textAlign: 'center' },
  button:      { marginBottom: 12 },
  buttonText:  { color: Colors.text, fontSize: 16, fontWeight: '700' },
  footer:      { marginTop: 8, gap: 8 },
  linkButton:  { alignItems: 'center', paddingVertical: 6 },
  link:        { color: Colors.textSecondary, fontSize: 14 },
  linkSuccess: { color: '#48bb78', fontWeight: '600' },
});