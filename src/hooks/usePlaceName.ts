import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

/**
 * Resolved names, keyed by coarsely rounded coordinates.
 *
 * Two decimal places is a little over a kilometre, which is well inside the
 * smallest search radius — so every point that would resolve to the same town
 * shares one lookup. Reverse geocoding hits the OS geocoder (and on Android, the
 * network), and Discover re-reads the user on every focus, so without this the
 * same lookup would run on each tab switch.
 */
const cache = new Map<string, string | null>();

const keyFor = (latitude: number, longitude: number) =>
  `${latitude.toFixed(2)},${longitude.toFixed(2)}`;

/**
 * Turns coordinates into a place name a person recognises, or null when that
 * isn't possible.
 *
 * Null is a normal outcome, not an error: Android devices without Google Play
 * services have no geocoder at all, and the lookup needs the network. Callers
 * are expected to fall back to wording that doesn't name a place.
 */
export async function resolvePlaceName(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const key = keyFor(latitude, longitude);
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  let name: string | null = null;
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    // Ordered widest-recognition first: a city is the most meaningful label, and
    // the rest are fallbacks for rural coordinates that resolve to no city.
    name = place?.city ?? place?.subregion ?? place?.district ?? place?.region ?? null;
  } catch {
    name = null;
  }
  cache.set(key, name);
  return name;
}

/** Place name for the given coordinates, or null while loading or unavailable. */
export function usePlaceName(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (latitude == null || longitude == null) {
      setName(null);
      return;
    }
    let active = true;
    resolvePlaceName(latitude, longitude).then(resolved => {
      if (active) setName(resolved);
    });
    return () => { active = false; };
  }, [latitude, longitude]);

  return name;
}
