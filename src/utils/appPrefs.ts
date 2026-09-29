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
  /** Whether this device has opened the app tour. It then only comes back from Settings. */
  tourSeen: boolean;
}

const KEY = 'dogsout_prefs';
const DEFAULTS: AppPrefs = { freezeBackground: false, birthdayGreetedYear: 0, tourSeen: false };

/**
 * Device-local settings.
 *
 * <p>Not on the server on purpose: this is about how the app feels in your hand,
 * so it belongs to the phone rather than the account — the same person may well
 * want motion on a tablet and off on a phone. Kept in memory so a read is
 * synchronous, with SecureStore behind it only for persistence across restarts.
 */
let cache: AppPrefs = { ...DEFAULTS };
let loading: Promise<void> | null = null;
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
  /**
   * Called at startup; until it resolves the defaults apply. Every caller shares the
   * one read, so a second caller awaiting it really does wait for the stored values
   * rather than getting the defaults back while the first read is still in flight.
   */
  load(): Promise<void> {
    loading ??= (async () => {
      try {
        const raw = await read();
        if (raw) cache = { ...DEFAULTS, ...JSON.parse(raw) };
      } catch {
        // A corrupt or unreadable preference is not worth a broken launch.
      }
      listeners.forEach(l => l());
    })();
    return loading;
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
