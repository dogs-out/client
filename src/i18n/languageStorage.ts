import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'dogsout_language';

let cached: string | null = null;

export const languageStorage = {
  get: async (): Promise<string | null> => {
    if (cached !== null) return cached;
    if (Platform.OS === 'web') {
      cached = localStorage.getItem(KEY);
      return cached;
    }
    cached = await SecureStore.getItemAsync(KEY);
    return cached;
  },
  set: async (language: string): Promise<void> => {
    cached = language;
    if (Platform.OS === 'web') { localStorage.setItem(KEY, language); return; }
    await SecureStore.setItemAsync(KEY, language);
  },
};
