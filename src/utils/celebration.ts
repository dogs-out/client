import { useEffect, useState } from 'react';

export interface Celebration {
  /** Today is the signed-in user's birthday. */
  own: boolean;
  /** Names of their dogs with a birthday today. */
  dogNames: string[];
}

const NOTHING: Celebration = { own: false, dogNames: [] };

/**
 * Whose birthday it is today, for the signed-in account.
 *
 * <p>Kept in a module rather than a context because the things that read it — the
 * floating background and the greeting — sit above every screen, while the thing
 * that knows it is whichever call to {@code /users/me} happened most recently. A
 * context would mean threading a provider through auth screens that have no user.
 *
 * <p>Cleared on sign-out so the next person to use the phone does not inherit
 * somebody else's cake.
 */
let current: Celebration = NOTHING;
const listeners = new Set<() => void>();

export const celebration = {
  set(value: Celebration): void {
    if (value.own === current.own
        && value.dogNames.length === current.dogNames.length
        && value.dogNames.every((n, i) => n === current.dogNames[i])) {
      return;
    }
    current = value;
    listeners.forEach(l => l());
  },

  clear(): void {
    celebration.set(NOTHING);
  },

  get(): Celebration {
    return current;
  },

  /** Whether anything is being celebrated at all — what the background asks. */
  any(): boolean {
    return current.own || current.dogNames.length > 0;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

/** Re-renders the caller when the day (or the account) changes under it. */
export function useCelebration(): Celebration {
  const [value, setValue] = useState(celebration.get());
  useEffect(() => celebration.subscribe(() => setValue(celebration.get())), []);
  return value;
}
