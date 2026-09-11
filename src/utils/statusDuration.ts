import { WalkStatus } from '../services/userService';

/**
 * How long each status may stand, as slider stops rather than a free number.
 *
 * <p>The ranges differ because the statuses do: a walk is an afternoon, a holiday
 * is weeks. One shared scale meant a slider where nearly every stop was wrong for
 * the status in hand — most of its travel covering durations nobody would pick.
 *
 * <p>These mirror the bounds on the server's WalkStatus, which clamps anything
 * outside them.
 */
export const STATUS_DURATIONS: Record<WalkStatus, number[]> = {
  // Hours, for the statuses that describe right now.
  WALKING:     [1, 2, 3, 4, 5],
  AT_THE_PARK: [1, 2, 3, 4, 5],
  // A sitting job runs from an afternoon to someone's whole holiday.
  SITTING:     [1, 2, 4, 8, 12, 24, 48, 72, 168, 336, 504],
  // Three days to three weeks, in days.
  ON_VACATION: [72, 96, 120, 144, 168, 240, 336, 408, 504],
  AT_HOME:     [1, 2, 4, 8, 12, 24, 48, 72, 168],
  BUSY:        [1, 2, 4, 8, 12, 24, 48, 72, 168],
};

export interface DurationLabel {
  key: 'whosOutside.forHours' | 'whosOutside.forDays' | 'whosOutside.forWeeks';
  count: number;
}

/**
 * Picks the largest unit that divides the span, so 168 reads as a week rather
 * than seven days and 72 as three days rather than a lot of hours.
 */
export function durationLabel(hours: number): DurationLabel {
  if (hours < 24) return { key: 'whosOutside.forHours', count: hours };
  if (hours % 168 === 0) return { key: 'whosOutside.forWeeks', count: hours / 168 };
  return { key: 'whosOutside.forDays', count: Math.round(hours / 24) };
}

/** The stop closest to a given span, so switching status keeps roughly what was chosen. */
export function nearestStop(status: WalkStatus, hours: number): number {
  const stops = STATUS_DURATIONS[status];
  return stops.reduce((best, stop) =>
    Math.abs(stop - hours) < Math.abs(best - hours) ? stop : best, stops[0]);
}
