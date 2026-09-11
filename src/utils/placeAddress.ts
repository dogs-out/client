import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

/**
 * Builds the address people actually want to copy, and opens it in a maps app.
 *
 * <p>What the app stores is what the place search returned — "Herrenholzweg,
 * Dietlikon", or just "Kreuzlingen" — which is fine as a label and useless pasted
 * into a maps app or sent to a friend. The coordinates are exact, though, so the
 * postal code and street number can be recovered from them.
 */
export interface PlaceLike {
  parkName: string;
  address: string | null;
  latitude: number;
  longitude: number;
}

/**
 * Full address for the given point, falling back to whatever was stored.
 *
 * <p>Reverse geocoding is done here rather than at creation time so it also works
 * for the playdates that already exist, and for pin-drops, which never had a
 * structured address to begin with.
 */
export async function fullAddress(place: PlaceLike): Promise<string> {
  const stored = place.address?.trim() || null;
  try {
    const [found] = await Location.reverseGeocodeAsync({
      latitude: place.latitude,
      longitude: place.longitude,
    });
    if (!found) return stored ?? place.parkName;

    const street = [found.street, found.streetNumber].filter(Boolean).join(' ');
    const town = [found.postalCode, found.city ?? found.subregion].filter(Boolean).join(' ');
    const lines = [street || null, town || null, found.country ?? null].filter(Boolean);

    // A lookup that produced nothing useful is worse than the label we already had.
    return lines.length > 0 ? lines.join(', ') : (stored ?? place.parkName);
  } catch {
    return stored ?? place.parkName;
  }
}

/**
 * Opens the point in the platform's own maps app.
 *
 * <p>Coordinates rather than the address string: the address is a best guess and
 * a park with no street number is exactly where a text search lands you in the
 * wrong place. The label is passed alongside so the pin is named.
 */
export function openInMaps(place: PlaceLike): Promise<unknown> {
  const { latitude: lat, longitude: lon, parkName } = place;
  const label = encodeURIComponent(parkName);

  const url = Platform.select({
    ios: `http://maps.apple.com/?ll=${lat},${lon}&q=${label}`,
    // geo: hands off to whichever maps app the user has set as default.
    android: `geo:${lat},${lon}?q=${lat},${lon}(${label})`,
    default: `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
  });

  return Linking.openURL(url).catch(() =>
    // No maps app registered for the scheme — the web map always resolves.
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`));
}
