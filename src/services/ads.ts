import { Platform } from 'react-native';
import mobileAds, { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus } from 'react-native-google-mobile-ads';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

let ready: Promise<boolean> | null = null;

/**
 * Consent, tracking permission and SDK start-up, in the order the rules want them:
 *
 * <ol>
 *   <li>Google's consent form (UMP). The app is used in Switzerland and the EU, where
 *       personalised ads need consent first; UMP decides whether to show the form.</li>
 *   <li>Apple's App Tracking Transparency prompt on iOS, after that — personalised
 *       ads on iOS also need the IDFA, and asking twice in a row reads as one ask.</li>
 *   <li>Only then the SDK, and only if consent allows any ads at all.</li>
 * </ol>
 *
 * <p>Started lazily from the first Discover swipe rather than at launch, so neither
 * system dialog lands on top of sign-in or the app tour. Shared: every caller gets
 * the same answer. Resolves false whenever ads cannot or may not be requested; the
 * deck then simply has no ad cards.
 */
export function initAds(): Promise<boolean> {
  ready ??= (async () => {
    try {
      if (__DEV__) console.log('[ads] gathering consent');
      const consent = await AdsConsent.gatherConsent();
      if (__DEV__) console.log('[ads] consent', consent.status, 'canRequestAds', consent.canRequestAds);
      if (Platform.OS === 'ios') {
        const { status } = await getTrackingPermissionsAsync();
        if (status === 'undetermined') await requestTrackingPermissionsAsync();
      }
      if (!consent.canRequestAds) {
        console.warn('[ads] consent does not allow ads', consent.status);
        return false;
      }
      await mobileAds().initialize();
      if (__DEV__) console.log('[ads] SDK initialised');
      return true;
    } catch (err) {
      console.warn('[ads] start-up failed:', err instanceof Error ? err.message : String(err));
      // An error (offline, say) is not an answer, so the next call tries again. A
      // consent that rules ads out, above, is an answer and is kept.
      ready = null;
      return false;
    }
  })();
  return ready;
}

/**
 * Re-opens the consent choices — required by UMP to be reachable somewhere in the app.
 *
 * <p>The consent status has to be loaded in this app session first, or the form has
 * nothing to show and the call quietly does nothing — which is what made the Settings
 * row look dead for anyone who opened Settings before their first swipe.
 *
 * @returns false when Google has no form for this user (consent not required where
 *          they are), so the caller can say so instead of appearing to ignore the tap
 */
export async function showAdPrivacyOptions(): Promise<boolean> {
  const info = await AdsConsent.requestInfoUpdate();
  if (info.privacyOptionsRequirementStatus !== AdsConsentPrivacyOptionsRequirementStatus.REQUIRED) {
    return false;
  }
  await AdsConsent.showPrivacyOptionsForm();
  return true;
}
