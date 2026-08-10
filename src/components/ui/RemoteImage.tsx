import { Image } from 'expo-image';
import { ImageStyle, StyleProp } from 'react-native';

type Props = Readonly<{
  source: { uri: string };
  style?: StyleProp<ImageStyle>;
  /** Named to match React Native's Image so call sites read the same. */
  resizeMode?: 'cover' | 'contain' | 'fill' | 'none';
}>;

/**
 * Image component for photos fetched from the API.
 *
 * Photos used to arrive inline in the JSON, so they were simply present once a
 * screen had its data. Now they are URLs, which means every render is a potential
 * network fetch — React Native's own Image caches unreliably on iOS and barely at
 * all on Android, so a scroll back up would re-download every avatar.
 *
 * `expo-image` caches to memory and disk. The server marks photo objects immutable
 * with a one-year max-age (a new upload always gets a new key), so a cached image
 * never needs revalidating and the second visit to any screen costs nothing.
 *
 * The short transition covers the gap between layout and the image arriving, which
 * did not exist back when the bytes came down with the JSON.
 */
export function RemoteImage({ source, style, resizeMode = 'cover' }: Props) {
  return (
    <Image
      source={source}
      style={style}
      contentFit={resizeMode}
      cachePolicy="memory-disk"
      transition={150}
    />
  );
}
