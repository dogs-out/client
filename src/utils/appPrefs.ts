import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface AppPrefs {
  /** Stops the background emoji drifting. Motion bothers some people. */
  freezeBackground: boolean;
  /**
   * Calendar year this device last showed the birthday greeting. 0 means never.
   * Per year rather than per day: a birthday only comes round once, and this is
   * what stops the greeting reappearing on every launch for a whole day.
   */
  birthdayGreetedYear: number;
}

const KEY = 'dogsout_prefs';
const DEFAULTS: AppPrefs = { freezeBackground: false, birthdayGreetedYear: 0 };

/**
 * Device-local settings.
 *
 * <p>Not on the server on purpose: this is about how the app feels in your hand,
 * so it belongs to the phone rather than the account — the same person may well
 * want motion on a tablet and off on a phone. Kept in memory so a read is
 * synchronous, with SecureStore behind it only for persistence across restarts.
 */
let cache: AppPrefs = { ...DEFAULTS };
let loaded = false;
const listeners = new Set<() => void>();

async function read(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}

async function write(value: string): Promise<void> {
  if (Platform.OS === 'web') { localStorage.setItem(KEY, value); return; }
  await SecureStore.setItemAsync(KEY, value);
}

export const appPrefs = {
  /** Called once at startup; until it resolves the defaults apply. */
  async load(): Promise<void> {
    if (loaded) return;
    loaded = true;
    try {
      const raw = await read();
      if (raw) cache = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch {
      // A corrupt or unreadable preference is not worth a broken launch.
    }
    listeners.forEach(l => l());
  },

  get(): AppPrefs {
    return cache;
  },

  set<K extends keyof AppPrefs>(key: K, value: AppPrefs[K]): void {
    cache = { ...cache, [key]: value };
    listeners.forEach(l => l());
    write(JSON.stringify(cache)).catch(() => { /* stays for this session at least */ });
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

/** Re-renders the caller whenever any preference changes. */
export function useAppPrefs(): AppPrefs {
  const [prefs, setPrefs] = useState(appPrefs.get());
  useEffect(() => appPrefs.subscribe(() => setPrefs(appPrefs.get())), []);
  return prefs;
}
