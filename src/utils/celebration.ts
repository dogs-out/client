import { useEffect, useState } from 'react';

/**
 * Whether today is the signed-in user's birthday, or one of their dogs'.
 *
 * <p>Kept in a module rather than a context because the thing that reads it —
 * the floating background — sits on every screen, and the thing that knows it is
 * whichever call to {@code /users/me} happened most recently. A context would
 * mean threading a provider through auth screens that have no user at all.
 *
 * <p>Cleared on sign-out so the next person to use the phone does not inherit
 * somebody else's cake.
 */
let celebrating = false;
const listeners = new Set<() => void>();

export const celebration = {
  set(value: boolean): void {
    if (celebrating === value) return;
    celebrating = value;
    listeners.forEach(l => l());
  },

  get(): boolean {
    return celebrating;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

/** Re-renders the caller when the day (or the account) changes under it. */
export function useCelebration(): boolean {
  const [on, setOn] = useState(celebration.get());
  useEffect(() => celebration.subscribe(() => setOn(celebration.get())), []);
  return on;
}
