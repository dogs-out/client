import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { RemoteImage } from './RemoteImage';

/** Which part of the picture to show, as fractions of the whole. */
export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Props = Readonly<{
  uri: string;
  /** Null, or absent, shows the whole picture filled to the frame. */
  crop?: CropRect | null;
  /**
   * Cosmetics for the frame — background, corners, borders.
   *
   * <p>Any width or height in here is ignored: the props below win. They used to
   * lose, which is how a carousel measured its page width, passed it in, and
   * still laid every page out at the stale constant its stylesheet happened to
   * carry — pages one width, snapping another, drifting further every page.
   */
  style?: StyleProp<ViewStyle>;
  width: number;
  height: number;
}>;

/**
 * A photo shown through its stored framing.
 *
 * <p>The file on the server is always the whole picture — cropping is four
 * fractions kept beside it, so cropping in can be undone later. That means the
 * framing has to be applied here, at display time.
 *
 * <p>The arithmetic is the same trick a magnifier uses: blow the image up so that
 * the chosen fraction of it is exactly the size of the frame, then slide it so
 * that fraction sits in the opening. A frame 300 wide showing the middle half of
 * a photo renders the photo at 600 and shifts it left by a quarter of that.
 */
export function CroppedImage({ uri, crop, style, width, height }: Props) {
  // No framing, or a framing that covers everything: the ordinary case, and the
  // cheaper one — no wrapper arithmetic, just fill the frame.
  if (!crop || (crop.x <= 0 && crop.y <= 0 && crop.width >= 1 && crop.height >= 1)) {
    return <RemoteImage source={{ uri }} style={[style as never, { width, height }]} resizeMode="cover" />;
  }

  // Guard against a rectangle that would divide by zero or blow up to infinity;
  // a stored crop is user data and arrives over the network.
  const w = clamp(crop.width, 0.01, 1);
  const h = clamp(crop.height, 0.01, 1);
  const x = clamp(crop.x, 0, 1 - w);
  const y = clamp(crop.y, 0, 1 - h);

  // The image is laid out at whatever size makes the crop fill the frame.
  const scaledWidth = width / w;
  const scaledHeight = height / h;

  return (
    <View style={[style, { width, height, overflow: 'hidden' }]}>
      <RemoteImage
        source={{ uri }}
        style={{
          position: 'absolute',
          width: scaledWidth,
          height: scaledHeight,
          left: -x * scaledWidth,
          top: -y * scaledHeight,
        }}
        // fill, not cover: the box above is already the photo's own proportions
        // scaled up, so cover would crop it a second time.
        resizeMode="fill"
      />
    </View>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Shared so a placeholder can sit in the same box as a photo. */
export const croppedImageStyles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
});
