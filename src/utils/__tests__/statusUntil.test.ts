import { untilLabel } from '../statusUntil';

const NOW = new Date('2026-09-14T12:00:00Z').getTime();
const iso = (msFromNow: number) => new Date(NOW + msFromNow).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;

describe('how long a status has left', () => {
  it('counts minutes when it is nearly over', () => {
    // "until 12:20" is arithmetic the reader has to do; "20 minutes" is not.
    expect(untilLabel(iso(20 * MIN), 'en-GB', NOW)).toEqual({ key: 'whosOutside.forMinutes', count: 20 });
  });

  it('never says zero minutes', () => {
    expect(untilLabel(iso(20_000), 'en-GB', NOW)).toEqual({ key: 'whosOutside.forMinutes', count: 1 });
  });

  it('gives a time once it is further off', () => {
    const label = untilLabel(iso(3 * HOUR), 'en-GB', NOW);
    expect(label?.key).toBe('whosOutside.untilTime');
    expect(label?.when).toMatch(/\d/);
  });

  it('gives a day for a holiday rather than a time nobody reads', () => {
    const label = untilLabel(iso(6 * 24 * HOUR), 'en-GB', NOW);
    expect(label?.key).toBe('whosOutside.untilDay');
    expect(label?.when).toMatch(/\w/);
  });

  it('says open-ended rather than nothing when there is no expiry', () => {
    // A missing expiry is a statement — busy until further notice — not a gap.
    expect(untilLabel(null, 'en-GB', NOW)).toEqual({ key: 'whosOutside.openEnded' });
    expect(untilLabel(undefined, 'en-GB', NOW)).toEqual({ key: 'whosOutside.openEnded' });
    expect(untilLabel('', 'en-GB', NOW)).toEqual({ key: 'whosOutside.openEnded' });
  });

  it('says nothing about a status that has already run out', () => {
    expect(untilLabel(iso(-MIN), 'en-GB', NOW)).toBeNull();
    expect(untilLabel(iso(0), 'en-GB', NOW)).toBeNull();
  });

  it('says nothing rather than Invalid Date for a value it cannot read', () => {
    expect(untilLabel('not a date', 'en-GB', NOW)).toBeNull();
  });
});
