/**
 * How long a status still has to run, for the friends list.
 *
 * <p>Knowing somebody is busy is half an answer; knowing they are busy for
 * another twenty minutes is the whole one. An absent expiry is not a gap —
 * it means the status stands until they change it.
 */
export interface UntilLabel {
  key: 'whosOutside.untilTime' | 'whosOutside.untilDay' | 'whosOutside.forMinutes' | 'whosOutside.openEnded';
  /** Minutes remaining, for the short case. */
  count?: number;
  /** A wall-clock time or a weekday, already formatted for the locale. */
  when?: string;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Picks how to say it. Under an hour reads as minutes, because "until 18:47" is
 * arithmetic the reader has to do; beyond that a time is easier than counting
 * hours, and beyond a day only the day itself matters.
 */
export function untilLabel(until: string | null | undefined, locale: string, now = Date.now()): UntilLabel | null {
  if (!until) return { key: 'whosOutside.openEnded' };

  const end = new Date(until).getTime();
  if (!Number.isFinite(end)) return null;

  const left = end - now;
  // Already over. The server stops reporting expired statuses, so this only
  // happens in the seconds between a list loading and one running out.
  if (left <= 0) return null;

  if (left < HOUR) {
    return { key: 'whosOutside.forMinutes', count: Math.max(1, Math.round(left / MINUTE)) };
  }

  const endDate = new Date(end);
  if (left < 20 * HOUR && endDate.getDate() === new Date(now).getDate()) {
    return {
      key: 'whosOutside.untilTime',
      when: endDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
    };
  }

  return {
    key: 'whosOutside.untilDay',
    when: endDate.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' }),
  };
}
