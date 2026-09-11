import { WalkStatus } from '../../services/userService';
import { STATUS_DURATIONS, durationLabel, nearestStop } from '../statusDuration';

const ALL = Object.keys(STATUS_DURATIONS) as WalkStatus[];

describe('status duration stops', () => {
  it('keeps a walk to an afternoon and a holiday to weeks', () => {
    // The two ranges the product actually specifies.
    expect(STATUS_DURATIONS.WALKING).toEqual([1, 2, 3, 4, 5]);
    expect(STATUS_DURATIONS.AT_THE_PARK).toEqual([1, 2, 3, 4, 5]);
    expect(STATUS_DURATIONS.ON_VACATION[0]).toBe(72);                                    // 3 days
    expect(STATUS_DURATIONS.ON_VACATION[STATUS_DURATIONS.ON_VACATION.length - 1]).toBe(504); // 21 days
  });

  it('never goes backwards, so dragging right always means longer', () => {
    for (const status of ALL) {
      const stops = STATUS_DURATIONS[status];
      expect(stops).toEqual([...stops].sort((a, b) => a - b));
      expect(new Set(stops).size).toBe(stops.length);
      expect(stops.length).toBeGreaterThan(1);
    }
  });

  it('names each stop in its largest whole unit', () => {
    // The boundaries are the interesting part: 24 is a day, not 24 hours, and
    // 168 is a week, not seven days.
    expect(durationLabel(1)).toEqual({ key: 'whosOutside.forHours', count: 1 });
    expect(durationLabel(12)).toEqual({ key: 'whosOutside.forHours', count: 12 });
    expect(durationLabel(24)).toEqual({ key: 'whosOutside.forDays', count: 1 });
    expect(durationLabel(72)).toEqual({ key: 'whosOutside.forDays', count: 3 });
    expect(durationLabel(168)).toEqual({ key: 'whosOutside.forWeeks', count: 1 });
    expect(durationLabel(504)).toEqual({ key: 'whosOutside.forWeeks', count: 3 });
  });

  it('says ten days rather than one and a half weeks', () => {
    // Only exact multiples of a week earn the week label; the rest read in days.
    expect(durationLabel(240)).toEqual({ key: 'whosOutside.forDays', count: 10 });
    expect(durationLabel(408)).toEqual({ key: 'whosOutside.forDays', count: 17 });
  });

  it('gives every stop of every status a whole-number label', () => {
    for (const status of ALL) {
      for (const hours of STATUS_DURATIONS[status]) {
        expect(Number.isInteger(durationLabel(hours).count)).toBe(true);
      }
    }
  });

  it('keeps roughly the chosen span when the status changes under it', () => {
    // Switching from a two-hour walk to a holiday cannot keep two hours, but it
    // should land on the nearest thing the new status allows rather than reset.
    expect(nearestStop('ON_VACATION', 2)).toBe(72);
    expect(nearestStop('WALKING', 504)).toBe(5);
    expect(nearestStop('SITTING', 30)).toBe(24);
    expect(nearestStop('WALKING', 3)).toBe(3);
  });

  it('always returns a stop the status actually offers', () => {
    for (const status of ALL) {
      for (const probe of [0, 1, 7, 100, 9999]) {
        expect(STATUS_DURATIONS[status]).toContain(nearestStop(status, probe));
      }
    }
  });
});
