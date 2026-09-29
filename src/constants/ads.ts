import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

/** A native ad card is slotted into the Discover deck after every this many swipes. */
export const AD_EVERY_N_SWIPES = 4;

/**
 * ⚠️ TEST IDS. There is no AdMob account yet, so every build — release included —
 * requests Google's test ads, which are labelled "Test Ad" and earn nothing.
 * Before shipping ads for real: create the AdMob apps (iOS + Android), create one
 * Native ad unit per platform, and put the unit ids here and the app ids in the
 * react-native-google-mobile-ads plugin config in app.json.
 */
const RELEASE_NATIVE_UNIT = Platform.select({
  ios: TestIds.NATIVE,     // TODO(admob): ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN
  android: TestIds.NATIVE, // TODO(admob): ca-app-pub-XXXXXXXXXXXXXXXX/NNNNNNNNNN
  default: TestIds.NATIVE,
});

/** Development builds always use test ads: clicking your own real ads gets an AdMob account banned. */
export const DECK_NATIVE_AD_UNIT = __DEV__ ? TestIds.NATIVE : RELEASE_NATIVE_UNIT;
