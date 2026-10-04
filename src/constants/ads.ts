import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/** A native ad card is slotted into the Discover deck after every this many swipes. */
export const AD_EVERY_N_SWIPES = 4;

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
