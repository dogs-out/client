import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'dogsout_token';

// In-memory cache so the Axios interceptor never races against a Keychain write.
// SecureStore is still updated for persistence across app restarts.
let cached: string | null = null;

export const tokenStorage = {
  get: async (): Promise<string | null> => {
    if (cached !== null) return cached;
    if (Platform.OS === 'web') {
      cached = localStorage.getItem(KEY);
      return cached;
    }
    cached = await SecureStore.getItemAsync(KEY);
    return cached;
  },
  set: async (token: string): Promise<void> => {
    cached = token;
    if (Platform.OS === 'web') { localStorage.setItem(KEY, token); return; }
    await SecureStore.setItemAsync(KEY, token);
  },
  remove: async (): Promise<void> => {
    cached = null;
    if (Platform.OS === 'web') { localStorage.removeItem(KEY); return; }
    await SecureStore.deleteItemAsync(KEY);
  },
};