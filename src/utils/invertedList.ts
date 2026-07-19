import { Platform } from 'react-native';

/**
 * RN implements FlatList `inverted` as scaleY:-1 on iOS but scale:-1 (both
 * axes) on Android. Content that must read normally inside an inverted list
 * (e.g. ListEmptyComponent) needs the matching counter-transform, otherwise
 * it renders horizontally mirrored on Android.
 */
export function invertedListCounterTransform(os: typeof Platform.OS = Platform.OS) {
  return os === 'android' ? [{ scale: -1 }] : [{ scaleY: -1 }];
}
