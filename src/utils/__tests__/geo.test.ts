import { distanceKm, formatDistance } from '../geo';

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(47.37, 8.54, 47.37, 8.54)).toBe(0);
  });

  it('measures Zürich to Bern at roughly 95 km', () => {
    expect(distanceKm(47.3779, 8.5403, 46.948, 7.4474)).toBeGreaterThan(90);
    expect(distanceKm(47.3779, 8.5403, 46.948, 7.4474)).toBeLessThan(100);
  });
});

describe('formatDistance', () => {
  const t = ((key: string, opts?: { km: number }) => (opts ? `${key}:${opts.km}` : key)) as unknown as Parameters<typeof formatDistance>[1];

  it('is empty when either side has no location', () => {
    expect(formatDistance(-1, t)).toBe('');
  });

  it('says less than a kilometre under 1 km', () => {
    expect(formatDistance(0.4, t)).toBe('matching.discover.lessThanOneKm');
  });

  it('rounds to whole kilometres', () => {
    expect(formatDistance(12.6, t)).toBe('matching.discover.distanceAway:13');
  });
});
