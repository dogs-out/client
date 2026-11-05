import { useCallback, useEffect, useRef, useState } from 'react';
import { AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { AD_REQUEST_CONTEXT, REWARDED_BONE_AD_UNIT } from '../../constants/ads';
import { initAds } from '../../services/ads';
import { BoneStatus, boneService } from '../../services/boneService';
import { userService } from '../../services/userService';

/** How long to wait for Google's callback to reach the server after the reward. */
const POLL_TRIES = 6;
const POLL_MS = 1500;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * A rewarded ad that earns one bone.
 *
 * <p>The app never grants the bone itself: the ad carries the user's id, Google
 * tells the server once it was watched (server-side verification), and this only
 * waits for the new count to show up. `available` is false where no ad unit
 * exists yet or ads may not be shown (no consent).
 *
 * <p>Nothing happens until `enabled` (the bones ran out): starting ads asks for
 * consent, and that dialog belongs to a moment ads are actually about.
 */
export function useRewardedBone(enabled: boolean, onBones: (bones: BoneStatus) => void) {
  const [userId, setUserId] = useState<number | null>(null);
  const [canShowAds, setCanShowAds] = useState(false);
  const [watching, setWatching] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!enabled || !REWARDED_BONE_AD_UNIT) return;
    userService.getMe().then(me => { if (mounted.current) setUserId(me.id); }).catch(() => {});
    initAds().then(ok => { if (mounted.current) setCanShowAds(ok); });
  }, [enabled]);

  const watch = useCallback(async () => {
    if (!REWARDED_BONE_AD_UNIT || userId == null || watching) return;
    setWatching(true);
    const before = await boneService.getStatus().catch(() => null);
    const ad = RewardedAd.createForAdRequest(REWARDED_BONE_AD_UNIT, {
      ...AD_REQUEST_CONTEXT,
      serverSideVerificationOptions: { userId: String(userId) },
    });
    let earned = false;
    const subs: (() => void)[] = [];

    // Settles when the ad is closed, or when it fails to load or show.
    await new Promise<void>(resolve => {
      subs.push(
        ad.addAdEventListener(RewardedAdEventType.LOADED, () => { ad.show().catch(() => resolve()); }),
        ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { earned = true; }),
        ad.addAdEventListener(AdEventType.CLOSED, () => resolve()),
        ad.addAdEventListener(AdEventType.ERROR, () => resolve()),
      );
      ad.load();
    });
    subs.forEach(unsubscribe => unsubscribe());

    if (earned) {
      // Google's callback is usually there within a second or two.
      for (let i = 0; i < POLL_TRIES; i++) {
        const now = await boneService.getStatus().catch(() => null);
        if (now && (!before || now.remaining > before.remaining || now.adRewardsLeft < before.adRewardsLeft)) {
          if (mounted.current) onBones(now);
          break;
        }
        await sleep(POLL_MS);
      }
    }
    if (mounted.current) setWatching(false);
  }, [userId, watching, onBones]);

  return { available: REWARDED_BONE_AD_UNIT != null && canShowAds && userId != null, watching, watch };
}
