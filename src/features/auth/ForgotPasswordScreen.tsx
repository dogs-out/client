import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { authService } from '../../services/authService';
import { getApiError } from '../../utils/apiError';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { Colors } from '../../constants/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) { setError(t('auth.forgotPassword.enterEmail')); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.forgotPassword(email);
      navigation.navigate('ResetPassword', { email });
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
        <Text style={styles.title}>{t('auth.forgotPassword.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.forgotPassword.subtitle')}</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder={t('auth.login.emailPlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoFocus
        />

        {loading ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={Colors.primary} />
        ) : (
          <GlassButton onPress={handleSubmit} style={styles.button}>
            <Text style={styles.buttonText}>{t('auth.forgotPassword.sendResetEmail')}</Text>
          </GlassButton>
        )}

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
          <Text style={styles.link}>{t('auth.forgotPassword.backToLogin')}</Text>
        </TouchableOpacity>
      </GlassCard>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:     { flex: 1, backgroundColor: Colors.background },
  container:  { flex: 1, padding: 24, justifyContent: 'center' },
  card:       { width: '100%' },
  title:      { fontSize: 26, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  subtitle:   { fontSize: 15, color: Colors.textSecondary, marginBottom: 24 },
  error:      { color: Colors.error, marginBottom: 12, textAlign: 'center', fontSize: 14 },
  input:      { borderWidth: 1.5, borderColor: Colors.glass.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16, color: Colors.text, backgroundColor: Colors.glass.inputBg, letterSpacing: 0 },
  button:     { marginBottom: 12 },
  buttonText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  linkButton: { marginTop: 8, alignItems: 'center' },
  link:       { color: Colors.textSecondary, fontSize: 14 },
});