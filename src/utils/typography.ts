import { PixelRatio } from 'react-native';

/**
 * Scales a fixed `lineHeight` with the device's text-size setting.
 *
 * React Native scales `fontSize` for accessibility but leaves `lineHeight`
 * exactly as written, so a hard-coded pair like `{ fontSize: 15, lineHeight: 20 }`
 * turns into 22pt glyphs in a 20pt box as soon as someone enlarges their system
 * text — ascenders and descenders get sliced off, which is what "not all letters
 * are shown" looks like in a chat bubble.
 *
 * Read once at module load, which is when styles are built. The OS restarts the
 * app's JS context when the text-size setting changes, so the value stays in step.
 */
export const scaledLineHeight = (lineHeight: number): number =>
  Math.round(lineHeight * PixelRatio.getFontScale());
