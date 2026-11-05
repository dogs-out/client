import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeAd } from 'react-native-google-mobile-ads';
import { AD_REQUEST_CONTEXT, DECK_NATIVE_AD_UNIT } from '../../constants/ads';
import { usePremium } from '../../utils/premium';

/**
 * Keeps one native ad loaded and ready for the deck.
 *
 * <p>Loaded ahead of time so the card is there the moment its slot comes round —
 * an ad that starts loading on the slot's own swipe would either hold up the deck
 * or miss it. The caller turns `enabled` on one swipe before the slot; an ad that
 * is already loaded is kept even while it is off. `take()` hands the ready ad over (the caller then owns it and
 * destroys it once swiped away) and starts loading the next one. No ad is fine:
 * a slot with nothing loaded is simply skipped.
 */
export function useDeckAd(wanted: boolean): { take: () => NativeAd | null } {
  // Premium means no ads: nothing is loaded, and take() hands nothing out.
  const premium = usePremium();
  const enabled = wanted && !premium;
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
    NativeAd.createForAdRequest(DECK_NATIVE_AD_UNIT, { startVideoMuted: true, ...AD_REQUEST_CONTEXT })
      .then(loaded => { if (mountedRef.current) setAd(loaded); else loaded.destroy(); })
      // No fill or offline: this slot just has no ad. Logged, because "no ads ever"
      // is otherwise indistinguishable from "no ads yet".
      .catch(err => console.warn('[ads] native ad failed to load:', err instanceof Error ? err.message : String(err)))
      .finally(() => { loadingRef.current = false; });
  }, [enabled, ad, attempt]);

  const premiumRef = useRef(premium);
  premiumRef.current = premium;

  const take = useCallback(() => {
    // Premium bought after this ad loaded: keep it back.
    if (premiumRef.current) return null;
    const ready = heldRef.current;
    if (ready) setAd(null);
    else setAttempt(a => a + 1);
    return ready;
  }, []);

  return { take };
}
