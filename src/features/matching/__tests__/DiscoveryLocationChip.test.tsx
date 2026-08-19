import { render, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { DiscoveryLocationChip } from '../DiscoveryLocationChip';

// Keys and interpolation values are both asserted, so t() has to preserve them
// rather than collapsing to the key the way the other suites do.
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) =>
      params ? `${key}|${JSON.stringify(params)}` : key,
  }),
}));

jest.mock('expo-location', () => ({ reverseGeocodeAsync: jest.fn() }));

const reverseGeocode = Location.reverseGeocodeAsync as jest.Mock;

// usePlaceName caches by rounded coordinates, so every test uses its own point
// to avoid inheriting an earlier test's resolved name.
let nextCoord = 0;
const coords = () => {
  nextCoord += 1;
  return { latitude: 47 + nextCoord, longitude: 8 + nextCoord };
};

beforeEach(() => reverseGeocode.mockReset());

describe('DiscoveryLocationChip', () => {
  it('says no location is set when there are no coordinates', async () => {
    await render(
      <DiscoveryLocationChip latitude={null} longitude={null} radiusKm={25} onPress={jest.fn()} />
    );

    expect(screen.getByText('matching.discover.locationMissing')).toBeTruthy();
    // Nothing to geocode, so it must not reach for the OS geocoder at all
    expect(reverseGeocode).not.toHaveBeenCalled();
  });

  it('names the place once it resolves', async () => {
    reverseGeocode.mockResolvedValue([{ city: 'Zürich' }]);
    const { latitude, longitude } = coords();

    await render(
      <DiscoveryLocationChip
        latitude={latitude} longitude={longitude} radiusKm={25} onPress={jest.fn()}
      />
    );

    await waitFor(() =>
      expect(
        screen.getByText('matching.discover.searchingNear|{"place":"Zürich","km":25}')
      ).toBeTruthy()
    );
  });

  it('falls back to the radius alone when the place cannot be resolved', async () => {
    // Android without Play services has no geocoder at all
    reverseGeocode.mockRejectedValue(new Error('no geocoder'));
    const { latitude, longitude } = coords();

    await render(
      <DiscoveryLocationChip
        latitude={latitude} longitude={longitude} radiusKm={10} onPress={jest.fn()}
      />
    );

    await waitFor(() =>
      expect(screen.getByText('matching.discover.searchingWithin|{"km":10}')).toBeTruthy()
    );
  });

  /**
   * The radius shown has to be the one the feed actually uses. The server falls
   * back to 50 km when the user never set one, so showing anything else here
   * would describe a deck that doesn't exist.
   */
  it('shows the server default radius when none is saved', async () => {
    reverseGeocode.mockResolvedValue([{ city: 'Bern' }]);
    const { latitude, longitude } = coords();

    await render(
      <DiscoveryLocationChip
        latitude={latitude} longitude={longitude} radiusKm={null} onPress={jest.fn()}
      />
    );

    await waitFor(() =>
      expect(
        screen.getByText('matching.discover.searchingNear|{"place":"Bern","km":50}')
      ).toBeTruthy()
    );
  });

  it('uses a coarser area name when the point has no city', async () => {
    reverseGeocode.mockResolvedValue([{ city: null, subregion: 'Emmental' }]);
    const { latitude, longitude } = coords();

    await render(
      <DiscoveryLocationChip
        latitude={latitude} longitude={longitude} radiusKm={5} onPress={jest.fn()}
      />
    );

    await waitFor(() =>
      expect(
        screen.getByText('matching.discover.searchingNear|{"place":"Emmental","km":5}')
      ).toBeTruthy()
    );
  });
});
