import type { TFunction } from 'i18next';

/** "Tue" in the given language, from "TUESDAY". 2 Nov 2026 is a Monday. */
export function shortWeekday(name: string, language: string): string {
  const order = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const i = order.indexOf(name);
  if (i < 0) return name;
  return new Date(2026, 10, 2 + i).toLocaleDateString(language, { weekday: 'short' });
}

/**
 * How a sitting's time reads on a card:
 *   once:      "Tue 4 Nov · 09:00 – 12:00"
 *   days:      "Tue 4 Nov 09:00 – Sat 8 Nov 18:00"
 *   weekly:    "Every Tue, Thu · 09:00 – 12:00 · until 2 Dec"
 */
export function formatSittingWindow(
  job: { startsAt: string; endsAt: string; repeatWeekdays?: string[]; occurrenceMinutes?: number | null },
  t: TFunction,
  language: string,
): string {
  const from = new Date(job.startsAt);
  const to = new Date(job.endsAt);
  const day = (d: Date) => d.toLocaleDateString(language, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = (d: Date) => d.toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' });

  if (job.repeatWeekdays && job.repeatWeekdays.length > 0 && job.occurrenceMinutes) {
    const visitEnd = new Date(from.getTime() + job.occurrenceMinutes * 60000);
    const days = job.repeatWeekdays.map(d => shortWeekday(d, language)).join(', ');
    const until = to.toLocaleDateString(language, { day: 'numeric', month: 'short' });
    return `${t('sitter.window.every', { days })} · ${time(from)} – ${time(visitEnd)} · ${t('sitter.window.until', { date: until })}`;
  }
  if (from.toDateString() !== to.toDateString()) {
    return `${day(from)} ${time(from)} – ${day(to)} ${time(to)}`;
  }
  return `${day(from)} · ${time(from)} – ${time(to)}`;
}
