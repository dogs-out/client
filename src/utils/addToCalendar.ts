import * as Calendar from 'expo-calendar';
import { Linking, Platform } from 'react-native';

/**
 * Playdates have a start but no end, so the calendar entry gets a sensible block
 * rather than a zero-length event nobody can see in a week view.
 */
const DEFAULT_DURATION_HOURS = 1.5;

export type CalendarResult =
  | 'added'
  /** Permission refused — the only outcome the user can fix themselves. */
  | 'denied'
  /** Permission fine, but the device has no calendar anyone can write to. */
  | 'no-calendar'
  /** The write itself failed. `reason` says why. */
  | 'failed';

export interface CalendarOutcome {
  result: CalendarResult;
  /** Present on 'failed' — the underlying error, for the log and for support. */
  reason?: string;
}

export interface CalendarPlaydate {
  title: string | null;
  parkName: string;
  address: string | null;
  description: string | null;
  startsAt: string;
}

/**
 * Adds a playdate to the phone's own calendar.
 *
 * <p>Deliberately not two provider-specific paths: on both platforms the OS
 * calendar is what iCloud, Google and Exchange accounts sync into, so writing one
 * local event puts it in whichever calendar the person actually uses.
 *
 * <p>When that fails there is still {@link googleCalendarUrl}, which needs no
 * permission and no synced account — worth offering, because a device with no
 * writable calendar is a dead end otherwise.
 */
export async function addPlaydateToCalendar(playdate: CalendarPlaydate): Promise<CalendarOutcome> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') return { result: 'denied' };

    const candidates = await writableCalendars();
    if (candidates.length === 0) return { result: 'no-calendar' };

    const start = new Date(playdate.startsAt);
    const event = {
      title: playdate.title?.trim() || playdate.parkName,
      startDate: start,
      endDate: new Date(start.getTime() + DEFAULT_DURATION_HOURS * 60 * 60 * 1000),
      location: [playdate.parkName, playdate.address].filter(Boolean).join(', '),
      notes: playdate.description ?? undefined,
      // Hermes has shipped Intl inconsistently on Android, and passing an
      // undefined time zone through to the native side is its own failure. Let
      // expo-calendar fall back to the device's zone when we cannot name it.
      ...(deviceTimeZone() ? { timeZone: deviceTimeZone() } : {}),
    };

    // `allowsModifications` is a claim, not a guarantee — a synced account can
    // still refuse the insert. Walk the candidates rather than giving up on the
    // first one, which is the difference between working and not on devices with
    // several accounts attached.
    let lastError = 'no calendar accepted the event';
    for (const calendar of candidates) {
      try {
        await Calendar.createEventAsync(calendar.id, event);
        return { result: 'added' };
      } catch (err) {
        lastError = errorText(err);
      }
    }
    return { result: 'failed', reason: lastError };
  } catch (err) {
    return { result: 'failed', reason: errorText(err) };
  }
}

/**
 * A prefilled Google Calendar link, as the way out when the device write fails.
 *
 * <p>Opens the Google Calendar app on Android when it is installed and the web
 * form otherwise, and needs no permission at all — so it still works on a phone
 * with no account synced, or where the manufacturer's own permission layer
 * blocks the calendar provider even after Android has granted access.
 */
export function googleCalendarUrl(playdate: CalendarPlaydate): string {
  const start = new Date(playdate.startsAt);
  const end = new Date(start.getTime() + DEFAULT_DURATION_HOURS * 60 * 60 * 1000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: playdate.title?.trim() || playdate.parkName,
    dates: `${stamp(start)}/${stamp(end)}`,
    location: [playdate.parkName, playdate.address].filter(Boolean).join(', '),
  });
  if (playdate.description) params.append('details', playdate.description);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function openInGoogleCalendar(playdate: CalendarPlaydate): Promise<unknown> {
  return Linking.openURL(googleCalendarUrl(playdate));
}

type DeviceCalendar = Awaited<ReturnType<typeof Calendar.getCalendarsAsync>>[number];

/** Calendars this device says can take a new event, best candidate first. */
async function writableCalendars(): Promise<DeviceCalendar[]> {
  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = all.filter(c => c.allowsModifications);

  if (Platform.OS === 'ios') {
    // iOS names a default; try it first, then anything else that will take it.
    const preferred = await Calendar.getDefaultCalendarAsync().catch(() => null);
    if (preferred?.id) {
      return [preferred, ...writable.filter(c => c.id !== preferred.id)];
    }
  }
  // Android has no default. A primary account calendar beats a subscribed feed
  // that merely claims to be writable.
  return [...writable].sort((a, b) => Number(b.isPrimary ?? false) - Number(a.isPrimary ?? false));
}

function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
