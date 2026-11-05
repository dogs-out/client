import { useSyncExternalStore } from 'react';

/**
 * Whether the signed-in user has DogsOut Premium, as last reported by the server
 * (every bone status carries it). Shared so ad slots anywhere can step aside
 * without each asking the server.
 */
let premium = false;
const listeners = new Set<() => void>();

export function setPremium(value: boolean): void {
  if (value === premium) return;
  premium = value;
  listeners.forEach(l => l());
}

export function isPremium(): boolean {
  return premium;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function usePremium(): boolean {
  const premiumNow = useSyncExternalStore(subscribe, isPremium);
  return premiumNow;
}
