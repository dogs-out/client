import { formatSittingWindow, shortWeekday } from '../sittingWindow';

const t = ((key: string, o?: Record<string, unknown>) => (o ? `${key}:${JSON.stringify(o)}` : key)) as never;

describe('formatSittingWindow', () => {
  it('reads a single window as one day with two times', () => {
    const text = formatSittingWindow({ startsAt: '2026-11-03T08:00:00Z', endsAt: '2026-11-03T11:00:00Z' }, t, 'en');
    expect(text).toContain('·');
    expect(text.match(/Nov/g)).toHaveLength(1);
  });

  it('names both days for a sitting over several days', () => {
    const text = formatSittingWindow({ startsAt: '2026-11-03T08:00:00Z', endsAt: '2026-11-08T17:00:00Z' }, t, 'en');
    expect(text.match(/Nov/g)).toHaveLength(2);
  });

  it('reads a weekly series by its days and its end', () => {
    const text = formatSittingWindow({
      startsAt: '2026-11-03T08:00:00Z', endsAt: '2026-12-01T11:00:00Z',
      repeatWeekdays: ['TUESDAY', 'THURSDAY'], occurrenceMinutes: 180,
    }, t, 'en');
    expect(text).toContain('sitter.window.every:{"days":"Tue, Thu"}');
    expect(text).toContain('sitter.window.until');
  });
});

describe('shortWeekday', () => {
  it('translates weekday names', () => {
    expect(shortWeekday('MONDAY', 'en')).toBe('Mon');
    expect(shortWeekday('SUNDAY', 'en')).toBe('Sun');
  });
});
