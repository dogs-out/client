import { fireEvent, render, screen } from '@testing-library/react-native';
import { OutOfBones } from '../OutOfBones';
import { BoneCounter } from '../BoneCounter';
import { timeUntil } from '../useBones';
import type { BoneStatus } from '../../../services/boneService';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, o?: Record<string, unknown>) => (o ? `${key}:${JSON.stringify(o)}` : key) }),
}));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('react-native-google-mobile-ads', () => ({}));
jest.mock('../../ads/ListAdCard', () => ({ ListAdCard: () => null }));

const t = ((key: string, o?: Record<string, unknown>) => (o ? `${key}:${JSON.stringify(o)}` : key)) as never;

const status = (over: Partial<BoneStatus> = {}): BoneStatus => ({
  remaining: 0, dailyAllowance: 10, bonus: 0, premium: false, adRewardsLeft: 5,
  refillsAt: new Date(Date.now() + (3 * 60 + 12) * 60000).toISOString(), ...over,
});

describe('timeUntil', () => {
  it('counts hours and minutes, rounding the minutes up', () => {
    const now = Date.parse('2026-11-03T20:30:00Z');
    expect(timeUntil('2026-11-03T23:42:00Z', now, t)).toBe('bones.hoursMinutes:{"h":3,"m":12}');
    expect(timeUntil('2026-11-03T20:41:30Z', now, t)).toBe('bones.minutes:{"m":12}');
    expect(timeUntil('2026-11-03T20:00:00Z', now, t)).toBe('');
  });
});

describe('BoneCounter', () => {
  it('shows nothing until the count is known', async () => {
    await render(<BoneCounter bones={null} />);
    expect(screen.queryByTestId('bone-counter')).toBeNull();
  });

  it('shows the count', async () => {
    await render(<BoneCounter bones={status({ remaining: 7 })} />);
    expect(screen.getByText('7')).toBeTruthy();
  });
});

describe('OutOfBones', () => {
  it('says when the bones come back', async () => {
    await render(<OutOfBones bones={status()} onRefilled={jest.fn()} />);
    expect(screen.getByText(/bones.outSub/)).toBeTruthy();
    expect(screen.getByText(/"count":10/)).toBeTruthy();
  });

  it('offers an ad only while one can still earn a bone', async () => {
    const onWatchAd = jest.fn();
    const { rerender } = await render(<OutOfBones bones={status()} onWatchAd={onWatchAd} onRefilled={jest.fn()} />);
    await fireEvent.press(screen.getByTestId('bones-watch-ad'));
    expect(onWatchAd).toHaveBeenCalled();

    await rerender(<OutOfBones bones={status({ adRewardsLeft: 0 })} onWatchAd={onWatchAd} onRefilled={jest.fn()} />);
    expect(screen.queryByTestId('bones-watch-ad')).toBeNull();
  });

  it('asks for the new count once the refill time has passed', async () => {
    const onRefilled = jest.fn();
    await render(<OutOfBones bones={status({ refillsAt: new Date(Date.now() - 1000).toISOString() })} onRefilled={onRefilled} />);
    expect(onRefilled).toHaveBeenCalled();
  });
});
