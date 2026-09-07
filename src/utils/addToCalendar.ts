import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

/**
 * Playdates have a start but no end, so the calendar entry gets a sensible block
 * rather than a zero-length event nobody can see in a week view.
 */
const DEFAULT_DURATION_HOURS = 1.5;

export type CalendarResult = 'added' | 'denied' | 'failed';

/**
 * Adds a playdate to the phone's own calendar.
 *
 * <p>Deliberately not two provider-specific paths: on both platforms the OS
 * calendar is what iCloud, Google and Exchange accounts sync into, so writing one
 * local event puts it in whichever calendar the person actually uses. A Google
 * Calendar template URL would only work for Google users and would bounce them
 * out to a browser.
 */
export async function addPlaydateToCalendar(playdate: {
  title: string | null;
  parkName: string;
  address: string | null;
  description: string | null;
  startsAt: string;
}): Promise<CalendarResult> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') return 'denied';

    const calendarId = await writableCalendarId();
    if (!calendarId) return 'failed';

    const start = new Date(playdate.startsAt);
    const end = new Date(start.getTime() + DEFAULT_DURATION_HOURS * 60 * 60 * 1000);

    await Calendar.createEventAsync(calendarId, {
      title: playdate.title?.trim() || playdate.parkName,
      startDate: start,
      endDate: end,
      location: [playdate.parkName, playdate.address].filter(Boolean).join(', '),
      notes: playdate.description ?? undefined,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return 'added';
  } catch {
    return 'failed';
  }
}

/**
 * The calendar the event should land in.
 *
 * iOS exposes a designated default; Android has no such concept, so we take the
 * first calendar the account can actually write to — picking a read-only one
 * (birthdays, holiday feeds) is the usual way this fails silently.
 */
async function writableCalendarId(): Promise<string | null> {
  if (Platform.OS === 'ios') {
    const preferred = await Calendar.getDefaultCalendarAsync();
    if (preferred?.id) return preferred.id;
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find(c => c.allowsModifications);
  return writable?.id ?? null;
}
