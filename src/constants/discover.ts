/**
 * Radius the server falls back to when the user has never saved one.
 *
 * Mirrors `DiscoverService.MAX_DISTANCE_KM` on the server. Anything shown to the
 * user has to match it — a radius on screen that the feed isn't actually using
 * describes a deck that doesn't exist.
 */
export const DEFAULT_RADIUS_KM = 50;
