/**
 * How long a walking status stays up, as slider stops rather than a free number.
 *
 * <p>An hour to four weeks spans three orders of magnitude, which a linear slider
 * handles badly — a third of its travel would cover the last fortnight nobody
 * picks. Fixed stops keep every useful answer one drag away.
 */
export const STATUS_DURATIONS = [1, 2, 4, 8, 12, 24, 48, 72, 168, 336, 672];

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
  if (hours < 168) return { key: 'whosOutside.forDays', count: Math.round(hours / 24) };
  return { key: 'whosOutside.forWeeks', count: Math.round(hours / 168) };
}
