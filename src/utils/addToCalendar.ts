import * as Calendar from 'expo-calendar/legacy';
import { Linking } from 'react-native';

/**
 * Playdates have a start but no end, so the calendar entry gets a sensible block
 * rather than a zero-length event nobody can see in a week view.
 */
const DEFAULT_DURATION_HOURS = 1.5;

export type CalendarResult =
  /** Saved from the system sheet (iOS reports this; Android cannot tell). */
  | 'added'
  /** The sheet was shown and closed. Android always ends here, saved or not. */
  | 'closed'
  /** The sheet could not be shown at all. `reason` says why. */
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
 * Adds a playdate to the phone's calendar through the system's own "new event" sheet.
 *
 * <p>The sheet rather than writing the event ourselves, for two reasons. It needs no
 * calendar permission at all — the user saves it, into the calendar they choose —
 * so there is no permission prompt to refuse and no list of calendars to read, which
 * iOS does not allow under write-only access anyway. And the direct-write functions
 * of the main expo-calendar module are stubs that throw since SDK 57, which is why
 * every attempt used to end in the Google Calendar fallback. These come from
 * `expo-calendar/legacy`, which still implements them.
 */
export async function addPlaydateToCalendar(playdate: CalendarPlaydate): Promise<CalendarOutcome> {
  try {
    const start = new Date(playdate.startsAt);
    const result = await Calendar.createEventInCalendarAsync({
      title: playdate.title?.trim() || playdate.parkName,
      startDate: start,
      endDate: new Date(start.getTime() + DEFAULT_DURATION_HOURS * 60 * 60 * 1000),
      location: [playdate.parkName, playdate.address].filter(Boolean).join(', '),
      notes: playdate.description ?? undefined,
    });
    return { result: result.action === 'saved' ? 'added' : 'closed' };
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

function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
