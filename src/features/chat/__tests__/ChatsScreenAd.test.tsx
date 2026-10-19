import { act, render, screen } from '@testing-library/react-native';
import ChatsScreen from '../ChatsScreen';
import { chatService } from '../../../services/chatService';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useIsFocused: () => true,
  useFocusEffect: (cb: () => void) => { const { useEffect } = jest.requireActual('react'); useEffect(cb, []); },
}));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('../../../components/GlassTabBar', () => ({ useTabBarHeight: () => 80 }));
jest.mock('../../../components/FloatingBackground', () => ({ FloatingBackground: () => null }));
jest.mock('../../../services/socket', () => ({ chatSocket: { subscribe: () => () => {}, isConnected: () => true } }));
jest.mock('../../../services/playdateService', () => ({ playdateService: { getPlaydates: () => Promise.resolve([]) } }));
jest.mock('../../../services/chatService', () => ({ chatService: { getMatches: jest.fn() } }));
jest.mock('../../ads/useListAd', () => ({ useListAd: () => ({ headline: 'An ad' }) }));
jest.mock('../../ads/ChatListAdCard', () => {
  const { Text } = jest.requireActual('react-native');
  return { ChatListAdCard: () => <Text>AD-ROW</Text> };
});
jest.mock('../../../constants/ads', () => ({ CHATS_NATIVE_AD_UNIT: 'test-unit' }));

const match = (id: number) => ({
  matchId: id, otherUserId: 100 + id, otherUserName: `Person${id}`, otherUserProfilePicture: null,
  matchedAt: '2026-10-01T10:00:00Z', lastMessageContent: 'hi', lastMessageSentAt: `2026-10-0${id}T10:00:00Z`,
  lastMessageSenderId: 100 + id, unreadCount: 0,
});

async function renderWith(matches: ReturnType<typeof match>[]) {
  (chatService.getMatches as jest.Mock).mockResolvedValue(matches);
  await render(<ChatsScreen />);
  await act(async () => {});
}

const order = () => screen.getAllByText(/^(AD-ROW|Person\d+)$/).map(n => n.props.children as string);

describe('Chats list ad', () => {
  it('sits after the third conversation, never as one of them', async () => {
    await renderWith([1, 2, 3, 4, 5].map(match));
    const rows = order();
    expect(rows.indexOf('AD-ROW')).toBe(3);
    expect(rows.filter(r => r === 'AD-ROW')).toHaveLength(1);
  });

  it('goes at the end of a shorter list', async () => {
    await renderWith([match(1)]);
    expect(order()).toEqual(['Person1', 'AD-ROW']);
  });

  it('is not shown when there are no conversations', async () => {
    await renderWith([]);
    expect(screen.queryByText('AD-ROW')).toBeNull();
  });
});
