import { pickCard } from '../DailyCard';
import type { DailyDigest } from '../../services/dailyService';

jest.mock('../../services/api', () => ({ __esModule: true, default: {} }));
jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({}) }));

const t = (key: string, o?: Record<string, unknown>) => (o ? `${key}:${JSON.stringify(o)}` : key);
const digest = (over: Partial<DailyDigest> = {}): DailyDigest => ({
  newNearby: 0, deckSize: 0, canHost: true,
  bones: { remaining: 10, dailyAllowance: 10, bonus: 0, refillsAt: '', premium: false, adRewardsLeft: 5 },
  ...over,
});

describe('pickCard', () => {
  it('leads with new people nearby', () => {
    const card = pickCard(digest({ newNearby: 3, deckSize: 8 }), t)!;
    expect(card.title).toBe('daily.newNearbyTitle:{"count":3}');
    expect(card.go).toBe('Discover');
  });

  it('then the bones, when there is someone to spend them on', () => {
    expect(pickCard(digest({ deckSize: 4 }), t)!.title).toBe('daily.bonesTitle:{"count":10}');
  });

  it('suggests a playdate when the deck is empty', () => {
    expect(pickCard(digest(), t)!.go).toBe('CreatePlaydate');
  });

  it('has nothing for a sitter with an empty deck', () => {
    expect(pickCard(digest({ canHost: false }), t)).toBeNull();
  });
});
