import { GlassView } from 'expo-glass-effect';

/** How far the glass extends past its parent's clip, in points. */
const OVERHANG = 8;

interface Props {
  isInteractive?: boolean;
}

/**
 * Live iOS glass filling a parent that clips (`overflow: 'hidden'` + borderRadius).
 *
 * Liquid Glass draws a light rim along the glass view's own edges. Laid exactly over
 * a rounded clip, the corners of that rim get cut off but its straight runs survive
 * as thin lines down the sides of every card and button — clearly visible on iOS 27,
 * faint on 26. Overhanging the clip on all sides puts the rim outside it, whatever
 * the iOS version draws there; the parent's own border supplies the visible edge.
 */
export function ClippedGlass({ isInteractive }: Readonly<Props>) {
  return (
    <GlassView
      isInteractive={isInteractive}
      glassEffectStyle="clear"
      style={{ position: 'absolute', top: -OVERHANG, left: -OVERHANG, right: -OVERHANG, bottom: -OVERHANG }}
    />
  );
}
