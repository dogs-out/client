/**
 * The arithmetic behind the pinch-to-zoom crop editor, kept apart from the
 * gesture plumbing so it can be tested.
 *
 * <p>Every function here refuses to return a non-finite number. That is not
 * defensive habit: a single NaN reaching an Animated transform does not throw
 * and does not warn — the view silently stops responding, which is
 * indistinguishable from a gesture that was never wired up.
 */

/** A touch as React Native reports it; the page coordinates are not guaranteed to be present. */
export interface TouchLike {
  pageX?: number;
  pageY?: number;
  locationX?: number;
  locationY?: number;
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * Distance between the first two touches, or null when it cannot be measured.
 *
 * <p>Falls back to location coordinates because page coordinates are missing from
 * touch objects on some platforms, and a missing coordinate previously produced
 * NaN rather than an absent reading.
 */
export function touchDistance(touches: readonly TouchLike[] | undefined): number | null {
  if (!touches || touches.length < 2) return null;
  const [a, b] = touches;

  const ax = finite(a.pageX) ? a.pageX : a.locationX;
  const ay = finite(a.pageY) ? a.pageY : a.locationY;
  const bx = finite(b.pageX) ? b.pageX : b.locationX;
  const by = finite(b.pageY) ? b.pageY : b.locationY;
  if (!finite(ax) || !finite(ay) || !finite(bx) || !finite(by)) return null;

  const distance = Math.hypot(ax - bx, ay - by);
  // Two touches reported at the same point would make the ratio infinite.
  return finite(distance) && distance > 0 ? distance : null;
}

/** Clamps to the range, and treats an unusable input as "leave it alone". */
export function clampScale(value: number, min: number, max: number, fallback: number): number {
  if (!finite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/**
 * Scale for the current finger spread, relative to where the pinch started.
 * Returns the starting scale unchanged when either reading is unusable.
 */
export function pinchScale(
  startScale: number,
  startDistance: number | null,
  distance: number | null,
  min: number,
  max: number,
): number {
  const base = finite(startScale) ? startScale : min;
  if (!finite(startDistance) || startDistance <= 0 || !finite(distance)) return clampScale(base, min, max, min);
  return clampScale(base * (distance / startDistance), min, max, base);
}

/**
 * How far the photo may be dragged while still covering the frame, per axis.
 * Zero at scale 1, which is why dragging correctly does nothing until zoomed in.
 */
export function maxOffset(frameSize: number, scale: number): number {
  if (!finite(frameSize) || !finite(scale)) return 0;
  return Math.max(0, (frameSize * scale - frameSize) / 2);
}
