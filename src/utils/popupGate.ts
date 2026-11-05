import { useEffect, useSyncExternalStore } from 'react';

/**
 * Keeps app-wide pop-ups from opening on top of each other. iOS presents one
 * modal at a time, so a second one opened while the first is up can silently
 * never appear. A pop-up that is required or tied to a moment (a match, a
 * missing dog detail) holds the gate while it shows; the optional daily card
 * waits until nothing holds it.
 */
let open = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(l => l());

/** Marks a pop-up as showing for as long as `showing` is true. */
export function useHoldPopupGate(showing: boolean): void {
  useEffect(() => {
    if (!showing) return;
    open += 1;
    notify();
    return () => { open -= 1; notify(); };
  }, [showing]);
}

/** True while another pop-up is showing. */
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const isBusy = () => open > 0;

export function usePopupGateBusy(): boolean {
  const busy = useSyncExternalStore(subscribe, isBusy);
  return busy;
}
