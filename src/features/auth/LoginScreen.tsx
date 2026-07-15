import { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as AppleAuthentication from 'expo-apple-authentication';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../../types/navigation';
import { AxiosError } from 'axios';
import { authService } from '../../services/authService';
import { tokenStorage } from '../../utils/tokenStorage';
import { getApiError } from '../../utils/apiError';
import { FloatingBackground } from '../../components/FloatingBackground';
import { GlassCard } from '../../components/GlassCard';
import { GlassButton } from '../../components/GlassButton';
import { Colors } from '../../constants/colors';
import { SUPPORTED_LANGUAGES, setLanguage } from '../../i18n';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

// Each platform needs its own Google OAuth client: iOS uses the reverse-client-ID
// URL scheme, Android uses the package name as scheme (validated via SHA-1 in Google
// Console), and web uses http://localhost:8081.
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID!;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;
const CLIENT_ID = Platform.select({
  ios: IOS_CLIENT_ID,
  android: ANDROID_CLIENT_ID,
  default: WEB_CLIENT_ID,
})!;

const REDIRECT_URI = AuthSession.makeRedirectUri({
  native: Platform.OS === 'android'
    ? 'com.dogsout.app:/oauth2redirect'
    : `com.googleusercontent.apps.${IOS_CLIENT_ID.split('.apps.')[0]}:/oauth2redirect`,
});

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['openid', 'email', 'profile'],
      redirectUri: REDIRECT_URI,
      usePKCE: true,
      responseType: AuthSession.ResponseType.Code,
    },
    GOOGLE_DISCOVERY
  );

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const code = response.params.code;
    const codeVerifier = request?.codeVerifier;
    if (!code || !codeVerifier) { setError(t('auth.login.googleSignInFailed')); return; }
    setLoading(true);
    setError(null);
    authService.googleAuth({ code, codeVerifier, redirectUri: REDIRECT_URI, clientId: CLIENT_ID })
      .then(async res => {
        await tokenStorage.set(res.token);
        navigation.reset({ index: 0, routes: [{ name: res.isNewUser ? 'ProfileSetup' : 'MainTabs' }] });
      })
      .catch(e => setError(getApiError(e)))
      .finally(() => setLoading(false));
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) { setError(t('auth.fillAllFields')); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await authService.login(email, password);
      await tokenStorage.set(res.token);
      navigation.reset({ index: 0, routes: [{ name: res.isNewUser ? 'ProfileSetup' : 'MainTabs' }] });
    } catch (e) {
      const status = e instanceof AxiosError ? e.response?.status : null;
      if (status === 404) {
        navigation.navigate('Register', { prefillEmail: email, prefillPassword: password });
      } else {
        setError(getApiError(e));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);

    // Step 1: native Apple sheet — errors here are Apple errors, not Axios
    let credential: AppleAuthentication.AppleAuthenticationCredential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
    } catch (e: unknown) {
      if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED') {
        setError(t('auth.login.appleSignInFailed'));
      }
      return;
    }

    if (!credential.identityToken) { setError(t('auth.login.appleSignInFailed')); return; }

    // Step 2: exchange token with our backend — errors here are Axios errors
    setLoading(true);
    try {
      const res = await authService.appleAuth(credential.identityToken);
      await tokenStorage.set(res.token);
      navigation.reset({ index: 0, routes: [{ name: res.isNewUser ? 'ProfileSetup' : 'MainTabs' }] });
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

        <View style={styles.languageRow}>
          {SUPPORTED_LANGUAGES.map(lang => (
            <TouchableOpacity key={lang.code} onPress={() => setLanguage(lang.code)} hitSlop={8}>
              <Text style={[styles.languageCode, i18n.language === lang.code && styles.languageCodeActive]}>
                {lang.code.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.appTitle}>Dogs Out</Text>

        <GlassCard style={styles.card}>
        <Text style={styles.title}>{t('auth.login.welcomeBack')}</Text>
        <Text style={styles.subtitle}>{t('auth.login.subtitle')}</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder={t('auth.login.emailPlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder={t('auth.login.passwordPlaceholder')}
          placeholderTextColor={Colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotPassword}>{t('auth.login.forgotPassword')}</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={Colors.primary} />
        ) : (
          <GlassButton onPress={handleLogin} style={styles.button}>
            <Text style={styles.buttonText}>{t('auth.login.signIn')}</Text>
          </GlassButton>
        )}

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>{t('auth.login.or')}</Text>
          <View style={styles.divider} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, (!request || loading) && styles.googleButtonDisabled]}
          onPress={() => { setError(null); promptAsync(); }}
          disabled={!request || loading}
        >
          <Ionicons name="logo-google" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.googleButtonText}>{t('auth.login.signInWithGoogle')}</Text>
        </TouchableOpacity>

        {appleAvailable && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        )}

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.link}>{t('auth.login.noAccount')} <Text style={styles.linkBold}>{t('auth.login.register')}</Text></Text>
        </TouchableOpacity>
        </GlassCard>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: Colors.background },
  container:      { flex: 1, padding: 24, justifyContent: 'center' },
  languageRow:    { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: 12 },
  languageCode:       { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, letterSpacing: 0.5 },
  languageCodeActive: { color: Colors.primary, fontWeight: '800' },
  appTitle:       {
    fontSize: 44, fontWeight: '800', color: Colors.primary, textAlign: 'center', marginBottom: 28, letterSpacing: -0.5,
    textShadowColor: 'rgba(46,158,107,0.30)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 3,
  },
  card:           { width: '100%' },
  title:          { fontSize: 26, fontWeight: 'bold', color: Colors.text, marginBottom: 4 },
  subtitle:       { fontSize: 15, color: Colors.textSecondary, marginBottom: 24 },
  error:          { color: Colors.error, marginBottom: 12, textAlign: 'center', fontSize: 14 },
  input:          { borderWidth: 1.5, borderColor: Colors.glass.inputBorder, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12, color: Colors.text, backgroundColor: Colors.glass.inputBg, letterSpacing: 0 },
  forgotPassword: { color: Colors.primary, textAlign: 'right', marginBottom: 20, fontSize: 14, fontWeight: '500' },
  button:             { marginBottom: 12 },
  buttonIcon:         { marginRight: 8 },
  buttonText:         { color: Colors.text, fontSize: 16, fontWeight: '700' },
  googleButton:       { backgroundColor: '#4285F4', height: 50, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 12 },
  googleButtonText:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  googleButtonDisabled: { opacity: 0.5 },
  appleButton:    { height: 50, width: '100%', marginBottom: 12 },
  dividerRow:     { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  divider:        { flex: 1, height: 1, backgroundColor: Colors.glass.divider },
  dividerText:    { marginHorizontal: 12, color: Colors.textSecondary, fontSize: 14 },
  linkButton:     { marginTop: 4, alignItems: 'center' },
  link:           { color: Colors.textSecondary, fontSize: 14 },
  linkBold:       { color: Colors.primary, fontWeight: '700' },
});