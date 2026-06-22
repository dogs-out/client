import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/navigation';
import { authService } from '../../services/authService';
import { tokenStorage } from '../../utils/tokenStorage';
import { getApiError } from '../../utils/apiError';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!;
const REDIRECT_URI = AuthSession.makeRedirectUri();

type Props = NativeStackScreenProps<RootStackParamList, 'GoogleOAuth'>;

export default function GoogleOAuthScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (response?.type !== 'success') return;

    const code = response.params.code;
    const codeVerifier = request?.codeVerifier;

    if (!code || !codeVerifier) {
      setError('Authentication failed. Please try again.');
      return;
    }

    setLoading(true);
    authService.googleAuth({ code, codeVerifier, redirectUri: REDIRECT_URI })
      .then(async res => {
        await tokenStorage.set(res.token);
        navigation.reset({ index: 0, routes: [{ name: res.isNewUser ? 'ProfileSetup' : 'Home' }] });
      })
      .catch(e => setError(getApiError(e)))
      .finally(() => setLoading(false));
  }, [response]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dogs Out</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
        <ActivityIndicator size="large" color="#4285F4" />
      ) : (
        <TouchableOpacity
          style={[styles.button, !request && styles.buttonDisabled]}
          onPress={() => { setError(null); promptAsync(); }}
          disabled={!request}
        >
          <Text style={styles.buttonText}>Sign in with Google</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 48, color: '#111' },
  button: { backgroundColor: '#4285F4', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#e53e3e', marginBottom: 16, textAlign: 'center' },
  linkButton: { marginTop: 24 },
  link: { color: '#666', fontSize: 14 },
});