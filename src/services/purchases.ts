import { Platform } from 'react-native';
import Purchases, { PurchasesPackage } from 'react-native-purchases';

/**
 * In-app purchases through RevenueCat. The app only buys; RevenueCat checks the
 * receipt with Apple or Google and tells our server (webhook), which then grants
 * Premium or the bones. The RevenueCat user is our user id, so the purchase finds
 * its way to the right account.
 *
 * Keys are RevenueCat's public SDK keys (safe to ship), from .env.
 */
const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
});

/** Product ids, the same in App Store Connect, Play Console and RevenueCat. */
export const PRODUCTS = {
  premium: 'premium_monthly',
  bones10: 'bones_10',
  bones30: 'bones_30',
} as const;

let configured = false;

export const purchases = {
  /** False without a key (a dev build without .env): the shop then stays hidden. */
  available: (): boolean => !!API_KEY,

  /** Connects RevenueCat to the signed-in account. Safe to call on every launch. */
  identify: async (userId: number): Promise<void> => {
    if (!API_KEY) return;
    try {
      if (!configured) {
        Purchases.configure({ apiKey: API_KEY, appUserID: String(userId) });
        configured = true;
      } else {
        await Purchases.logIn(String(userId));
      }
    } catch (err) {
      console.warn('[purchases] identify failed:', err instanceof Error ? err.message : String(err));
    }
  },

  /** The current offering's packages: Premium and the bone packs, with store prices. */
  packages: async (): Promise<PurchasesPackage[]> => {
    if (!configured) throw new Error('RevenueCat is not configured (no API key in this build, or not signed in yet)');
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) throw new Error('RevenueCat has no current offering');
    if (offerings.current.availablePackages.length === 0) {
      throw new Error('The offering has no packages: none of its products could be loaded from the store');
    }
    return offerings.current.availablePackages;
  },

  /** Resolves false when the buyer cancelled; throws on a real failure. */
  buy: async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      await Purchases.purchasePackage(pkg);
      return true;
    } catch (err) {
      if ((err as { userCancelled?: boolean }).userCancelled) return false;
      throw err;
    }
  },

  restore: async (): Promise<void> => {
    if (configured) await Purchases.restorePurchases();
  },
};

/** Which of our products a package sells. Android ids carry a base plan ("premium_monthly:monthly"). */
export function productOf(pkg: PurchasesPackage): string {
  return pkg.product.identifier.split(':')[0];
}
