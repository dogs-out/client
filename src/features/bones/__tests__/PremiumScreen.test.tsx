import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PremiumScreen from '../PremiumScreen';
import { purchases } from '../../../services/purchases';
import { boneService } from '../../../services/boneService';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key}:${JSON.stringify(o)}` : key) }),
}));
jest.mock('react-native-purchases', () => ({}));
jest.mock('../../../services/purchases', () => ({
  PRODUCTS: { premium: 'premium_monthly', bones10: 'bones_10', bones30: 'bones_30' },
  productOf: (p: { product: { identifier: string } }) => p.product.identifier.split(':')[0],
  purchases: { packages: jest.fn(), buy: jest.fn(), restore: jest.fn() },
}));
jest.mock('../../../services/boneService', () => ({ boneService: { getStatus: jest.fn() } }));
jest.mock('../../../services/userService', () => ({ userService: { getMe: () => Promise.resolve({ role: 'USER' }) } }));
jest.mock('../../../components/FloatingBackground', () => ({ FloatingBackground: () => null }));
jest.mock('../../../components/FullLegalLinks', () => ({ FullLegalLinks: () => null }));

const pkg = (identifier: string, priceString: string) => ({ product: { identifier, priceString } });
const status = (over = {}) => ({ remaining: 0, dailyAllowance: 10, bonus: 0, refillsAt: '', premium: false, adRewardsLeft: 5, ...over });

const nav = { goBack: jest.fn() } as never;

beforeEach(() => {
  jest.clearAllMocks();
  (purchases.packages as jest.Mock).mockResolvedValue([
    pkg('premium_monthly:monthly', 'CHF 4.90'), pkg('bones_10', 'CHF 1.00'), pkg('bones_30', 'CHF 2.00'),
  ]);
});

it('shows store prices for Premium and both packs', async () => {
  (boneService.getStatus as jest.Mock).mockResolvedValue(status());
  await render(<PremiumScreen navigation={nav} route={{} as never} />);
  await screen.findByText('premium.subscribe:{"price":"CHF 4.90"}');
  expect(screen.getByText('CHF 1.00')).toBeTruthy();
  expect(screen.getByText('CHF 2.00')).toBeTruthy();
});

it('shows Premium as active instead of a buy button', async () => {
  (boneService.getStatus as jest.Mock).mockResolvedValue(status({ premium: true }));
  await render(<PremiumScreen navigation={nav} route={{} as never} />);
  await screen.findByTestId('premium-active');
  expect(screen.queryByTestId('buy-premium')).toBeNull();
});

it('waits for the server after buying bones, then thanks', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  (boneService.getStatus as jest.Mock)
    .mockResolvedValueOnce(status())
    .mockResolvedValue(status({ bonus: 10 }));
  (purchases.buy as jest.Mock).mockResolvedValue(true);
  await render(<PremiumScreen navigation={nav} route={{} as never} />);
  await fireEvent.press(await screen.findByTestId('buy-bones_10'));

  await waitFor(() => expect(alert).toHaveBeenCalledWith('premium.thanksTitle', 'premium.thanksBones'));
});

it('says nothing when the buyer cancels', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  (boneService.getStatus as jest.Mock).mockResolvedValue(status());
  (purchases.buy as jest.Mock).mockResolvedValue(false);
  await render(<PremiumScreen navigation={nav} route={{} as never} />);
  await fireEvent.press(await screen.findByTestId('buy-bones_30'));
  await waitFor(() => expect(purchases.buy).toHaveBeenCalled());
  expect(alert).not.toHaveBeenCalled();
});
