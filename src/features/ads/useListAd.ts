import { useEffect, useRef, useState } from 'react';
import { NativeAd } from 'react-native-google-mobile-ads';
import { adsAlreadyStarted } from '../../services/ads';

/** Native ads go stale; past this they are replaced the next time the list is shown. */
const MAX_AGE_MS = 45 * 60 * 1000;

/**
 * One native ad for a list screen, loaded when the screen is shown and only if ads
 * are already running (consent is asked for in Discover, never here). Null when
 * there is no ad, which simply means no ad row.
 *
 * @param visible pass the screen's focus state: a fresh ad is fetched on a later
 *                visit once the shown one is old, never while it is on screen
 */
export function useListAd(unitId: string, visible: boolean): NativeAd | null {
  const [ad, setAd] = useState<NativeAd | null>(null);
  const loadedAt = useRef(0);
  const loading = useRef(false);
  const current = useRef<NativeAd | null>(null);
  current.current = ad;

  useEffect(() => () => { current.current?.destroy(); }, []);

  useEffect(() => {
    if (!visible || loading.current) return;
    if (current.current && Date.now() - loadedAt.current < MAX_AGE_MS) return;
    let cancelled = false;
    loading.current = true;
    adsAlreadyStarted()
      .then(started => started ? NativeAd.createForAdRequest(unitId, { startVideoMuted: true }) : null)
      .then(next => {
        if (!next) return;
        if (cancelled) { next.destroy(); return; }
        current.current?.destroy();
        loadedAt.current = Date.now();
        setAd(next);
      })
      .catch(err => console.warn('[ads] list ad failed to load:', err instanceof Error ? err.message : String(err)))
      .finally(() => { loading.current = false; });
    return () => { cancelled = true; };
  }, [visible, unitId]);

  return ad;
}
