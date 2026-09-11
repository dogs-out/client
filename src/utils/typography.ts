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
 * Read once at module load, which is when styles are built. iOS restarts the JS
 * context when the text-size setting changes, so the value stays in step there —
 * Android does not always, which means this can lag a scale behind.
 *
 * So: use it for text in a container that can grow, where being slightly tight
 * only affects rhythm. For anything inside a clipped container — a chat bubble,
 * a card with rounded corners — omit `lineHeight` entirely instead and let the
 * platform derive it, which cannot go stale.
 */
export const scaledLineHeight = (lineHeight: number): number =>
  Math.round(lineHeight * PixelRatio.getFontScale());
