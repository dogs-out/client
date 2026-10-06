import * as Location from 'expo-location';

export type DeviceLocationResult =
  | { ok: true; latitude: number; longitude: number }
  /** canAskAgain false: the phone will not show the prompt again; only Settings can change it. */
  | { ok: false; reason: 'denied'; canAskAgain: boolean }
  | { ok: false; reason: 'failed' };

/**
 * The phone's current position, asking for permission if it may.
 *
 * <p>Separates "refused for good" from "refused this time": after a first "Don't
 * allow" iOS and Android stop showing the prompt, and a button that only asks
 * again then silently does nothing — which is what made sign-up look broken.
 */
export async function currentDeviceLocation(): Promise<DeviceLocationResult> {
  try {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { ok: false, reason: 'denied', canAskAgain };
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { ok: true, latitude: loc.coords.latitude, longitude: loc.coords.longitude };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
