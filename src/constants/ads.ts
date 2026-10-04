import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/** A native ad card is slotted into the Discover deck after every this many swipes. */
export const AD_EVERY_N_SWIPES = 4;

/**
 * Release builds use the real "Discover deck" Native ad units from the DogsOut AdMob
 * account (publisher pub-6036286386570373). ⚠️ Android is still on Google's test
 * unit until its ad unit exists: put its id here, and its app id in BOTH places in
 * app.json (the expo plugin config and the top-level key the Gradle script reads).
 */
const RELEASE_NATIVE_UNIT = Platform.select({
  ios: 'ca-app-pub-6036286386570373/4546316834', // Discover deck (Native advanced)
  android: TestIds.NATIVE, // TODO(admob): ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN
  default: TestIds.NATIVE,
});

/** Development builds always use test ads: clicking your own real ads gets an AdMob account banned. */
export const DECK_NATIVE_AD_UNIT = __DEV__ ? TestIds.NATIVE : RELEASE_NATIVE_UNIT;
