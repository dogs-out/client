import { formatPrice } from '../../../services/marketService';
import { parsePrice } from '../EditListingScreen';

jest.mock('../../../services/api', () => ({ __esModule: true, default: {} }));
jest.mock('expo-image-picker', () => ({}));

describe('parsePrice', () => {
  it.each([
    ['15', 1500], ['12.50', 1250], ['12,5', 1250], ['CHF 8', 800], [' 0.80 ', 80],
  ])('reads %s as %d Rappen', (text, rappen) => {
    expect(parsePrice(text)).toBe(rappen);
  });

  it.each(['', 'abc', '12.555', '-5', '1 000'])('refuses %s', text => {
    expect(parsePrice(text)).toBeNull();
  });
});

describe('formatPrice', () => {
  it('shows whole francs without decimals and others with two', () => {
    expect(formatPrice(2500, 'Free')).toBe('CHF 25');
    expect(formatPrice(1250, 'Free')).toBe('CHF 12.50');
  });

  it('says free for no price', () => {
    expect(formatPrice(null, 'Gratis')).toBe('Gratis');
  });
});
