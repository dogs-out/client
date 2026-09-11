import { STATUS_DURATIONS, durationLabel } from '../statusDuration';

describe('status duration stops', () => {
  it('runs from an hour to four weeks, as the settings screen promises', () => {
    expect(STATUS_DURATIONS[0]).toBe(1);
    expect(STATUS_DURATIONS[STATUS_DURATIONS.length - 1]).toBe(672);
  });

  it('never goes backwards, so dragging right always means longer', () => {
    const sorted = [...STATUS_DURATIONS].sort((a, b) => a - b);
    expect(STATUS_DURATIONS).toEqual(sorted);
    expect(new Set(STATUS_DURATIONS).size).toBe(STATUS_DURATIONS.length);
  });

  it('names each stop in its largest whole unit', () => {
    // The boundaries are the interesting part: 24 is a day, not 24 hours, and
    // 168 is a week, not seven days.
    expect(durationLabel(1)).toEqual({ key: 'whosOutside.forHours', count: 1 });
    expect(durationLabel(12)).toEqual({ key: 'whosOutside.forHours', count: 12 });
    expect(durationLabel(24)).toEqual({ key: 'whosOutside.forDays', count: 1 });
    expect(durationLabel(72)).toEqual({ key: 'whosOutside.forDays', count: 3 });
    expect(durationLabel(168)).toEqual({ key: 'whosOutside.forWeeks', count: 1 });
    expect(durationLabel(672)).toEqual({ key: 'whosOutside.forWeeks', count: 4 });
  });

  it('gives every stop a whole-number label', () => {
    for (const hours of STATUS_DURATIONS) {
      expect(Number.isInteger(durationLabel(hours).count)).toBe(true);
    }
  });
});
