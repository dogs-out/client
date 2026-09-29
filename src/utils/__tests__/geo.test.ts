import { distanceKm } from '../geo';

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(47.37, 8.54, 47.37, 8.54)).toBe(0);
  });

  it('measures Zürich to Bern at roughly 95 km', () => {
    expect(distanceKm(47.3779, 8.5403, 46.948, 7.4474)).toBeGreaterThan(90);
    expect(distanceKm(47.3779, 8.5403, 46.948, 7.4474)).toBeLessThan(100);
  });
});
