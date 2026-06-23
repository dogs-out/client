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
import { RootStackParamList } from '../../types/navigation';
import { authService } from '../../services/authService';
import { tokenStorage } from '../../utils/tokenStorage';
import { getApiError } from '../../utils/apiError';
import { FloatingBackground } from '../../components/FloatingBackground';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

// Use the iOS-specific client ID on device (it has a matching CFBundleURLScheme registered),
// and the web client ID on web where the redirect is http://localhost:8081.
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID!;
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;
const CLIENT_ID = Platform.OS === 'ios' ? IOS_CLIENT_ID : WEB_CLIENT_ID;

// On native the redirect must match the reverse-client-ID scheme Google registered automatically.
// On web makeRedirectUri() returns http://localhost:8081 which is whitelisted in Google Console.
const REDIRECT_URI = AuthSession.makeRedirectUri({
  native: `com.googleusercontent.apps.${IOS_CLIENT_ID.split('.apps.')[0]}:/oauth2redirect`,
});

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
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
    if (!code || !codeVerifier) { setError('Google sign-in failed. Please try again.'); return; }
    setLoading(true);
    setError(null);
    authService.googleAuth({ code, codeVerifier, redirectUri: REDIRECT_URI })
      .then(async res => {
        await tokenStorage.set(res.token);
        navigation.reset({ index: 0, routes: [{ name: res.isNewUser ? 'ProfileSetup' : 'Home' }] });
      })
      .catch(e => setError(getApiError(e)))
      .finally(() => setLoading(false));
  }, [response]);

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
        setError('Apple Sign-In failed. Please try again.');
      }
      return;
    }

    if (!credential.identityToken) { setError('Apple Sign-In failed. Please try again.'); return; }

    // Step 2: exchange token with our backend — errors here are Axios errors
    setLoading(true);
    try {
      const res = await authService.appleAuth(credential.identityToken);
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
      <FloatingBackground />
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
        style={[styles.button, styles.googleButton, !request && styles.buttonDisabled]}
        onPress={() => { setError(null); promptAsync(); }}
        disabled={!request || loading}
      >
        <View style={styles.buttonContent}>
          <Ionicons name="logo-google" size={20} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </View>
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
  buttonDisabled: { opacity: 0.5 },
  buttonContent: { flexDirection: 'row', alignItems: 'center' },
  buttonIcon: { marginRight: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  appleButton: { height: 50, width: '100%', marginBottom: 12 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  divider: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
  dividerText: { marginHorizontal: 12, color: '#999', fontSize: 14 },
  linkButton: { marginTop: 4, alignItems: 'center' },
  link: { color: '#666', fontSize: 14 },
  linkBold: { color: '#111', fontWeight: '600' },
});