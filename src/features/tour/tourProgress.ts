import { useEffect, useState } from 'react';

/**
 * Where to pick the tour up again after a "Show me".
 *
 * <p>Null while the tour is not paused. Kept in memory only: a tour interrupted by
 * closing the app is not worth resuming next launch — Settings replays it.
 */
let resumeAt: number | null = null;
const listeners = new Set<() => void>();

export const tourProgress = {
  get: () => resumeAt,
  pause(nextSlide: number) {
    resumeAt = nextSlide;
    listeners.forEach(l => l());
  },
  clear() {
    resumeAt = null;
    listeners.forEach(l => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export function useTourResumeAt(): number | null {
  const [value, setValue] = useState(tourProgress.get());
  useEffect(() => tourProgress.subscribe(() => setValue(tourProgress.get())), []);
  return value;
}
