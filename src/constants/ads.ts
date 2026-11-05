import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/** A native ad card is slotted into the Discover deck after every this many swipes. */
export const AD_EVERY_N_SWIPES = 3;

/**
 * Release builds use the real "Discover deck" Native ad units from the DogsOut AdMob
 * account (publisher pub-6036286386570373). App ids live in app.json, in BOTH the
 * expo plugin config and the top-level key the Android Gradle script reads.
 */
const RELEASE_NATIVE_UNIT = Platform.select({
  ios: 'ca-app-pub-6036286386570373/4546316834', // Discover deck (Native advanced)
  android: 'ca-app-pub-6036286386570373/3262164484', // Discover deck (Native advanced)
  default: TestIds.NATIVE,
});

/** Development builds always use test ads: clicking your own real ads gets an AdMob account banned. */
export const DECK_NATIVE_AD_UNIT = __DEV__ ? TestIds.NATIVE : RELEASE_NATIVE_UNIT;

/**
 * The ad card in the lists (Chats, Playdates, Walks). Same Native unit as the deck
 * for now; give it its own unit in AdMob ("Lists") to see the placements apart.
 */
export const LIST_NATIVE_AD_UNIT = DECK_NATIVE_AD_UNIT;
/** The ad goes after this many entries of a list, or at the end of a shorter one. */
export const AD_AFTER_LIST_ITEMS = 3;

/**
 * "Extra bone" Rewarded ad units (created 2026-10-30). Null hides the button in a
 * release build, for a platform without a unit.
 * Each unit needs Server-side verification set to https://api.dogsout.app/bones/admob-ssv,
 * because the bone is granted by that callback, never by the app.
 */
const RELEASE_REWARDED_UNIT: string | null = Platform.select({
  ios: 'ca-app-pub-6036286386570373/1150721058', // Extra bone (Rewarded, SSV on)
  android: 'ca-app-pub-6036286386570373/8422706414', // Extra bone (Rewarded, SSV on)
  default: null,
});

export const REWARDED_BONE_AD_UNIT: string | null = __DEV__ ? TestIds.REWARDED : RELEASE_REWARDED_UNIT;

/**
 * Context sent with every ad request. Without consent to personalised ads, Google
 * picks ads by region alone, and that is how a Swedish travel-SIM ad ends up in a
 * Swiss dog app. Keywords and the site tell it what the app is about, so contextual
 * (non-personalised) ads lean towards dogs and pets.
 */
export const AD_REQUEST_CONTEXT = {
  keywords: ['dog', 'dogs', 'pets', 'dog food', 'dog training', 'Hund', 'Hunde', 'Haustier', 'Hundefutter', 'Hundeschule'],
  contentUrl: 'https://dogsout.app',
};
