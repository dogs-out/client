import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeAd } from 'react-native-google-mobile-ads';
import { DECK_NATIVE_AD_UNIT } from '../../constants/ads';

/**
 * Keeps one native ad loaded and ready for the deck.
 *
 * <p>Loaded ahead of time so the card is there the moment its slot comes round —
 * an ad that starts loading on the fourth swipe would either hold up the deck or
 * miss its slot. `take()` hands the ready ad over (the caller then owns it and
 * destroys it once swiped away) and starts loading the next one. No ad is fine:
 * a slot with nothing loaded is simply skipped.
 */
export function useDeckAd(enabled: boolean): { take: () => NativeAd | null } {
  const [ad, setAd] = useState<NativeAd | null>(null);
  // Bumped when a slot comes round with nothing loaded, so a failed load is
  // retried for the next slot instead of never again.
  const [attempt, setAttempt] = useState(0);
  const loadingRef = useRef(false);
  const heldRef = useRef<NativeAd | null>(null);
  heldRef.current = ad;

  const mountedRef = useRef(true);

  // An ad still waiting for its slot when the screen goes away is released here.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      heldRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!enabled || ad || loadingRef.current) return;
    loadingRef.current = true;
    NativeAd.createForAdRequest(DECK_NATIVE_AD_UNIT, { startVideoMuted: true })
      .then(loaded => { if (mountedRef.current) setAd(loaded); else loaded.destroy(); })
      .catch(() => { /* no fill or offline: this slot just has no ad */ })
      .finally(() => { loadingRef.current = false; });
  }, [enabled, ad, attempt]);

  const take = useCallback(() => {
    const ready = heldRef.current;
    if (ready) setAd(null);
    else setAttempt(a => a + 1);
    return ready;
  }, []);

  return { take };
}
