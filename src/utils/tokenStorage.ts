import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'dogsout_token';

export const tokenStorage = {
  get: (): Promise<string | null> => {
    if (Platform.OS === 'web') return Promise.resolve(localStorage.getItem(KEY));
    return SecureStore.getItemAsync(KEY);
  },
  set: (token: string): Promise<void> => {
    if (Platform.OS === 'web') { localStorage.setItem(KEY, token); return Promise.resolve(); }
    return SecureStore.setItemAsync(KEY, token);
  },
  remove: (): Promise<void> => {
    if (Platform.OS === 'web') { localStorage.removeItem(KEY); return Promise.resolve(); }
    return SecureStore.deleteItemAsync(KEY);
  },
};