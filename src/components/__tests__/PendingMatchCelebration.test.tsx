import { act, render, screen } from '@testing-library/react-native';
import { PendingMatchCelebration } from '../PendingMatchCelebration';
import { chatService } from '../../services/chatService';

jest.mock('@react-navigation/native', () => ({ useNavigation: () => ({ navigate: jest.fn() }) }));
jest.mock('../../services/socket', () => ({ chatSocket: { subscribe: () => () => {} } }));
jest.mock('../../services/userService', () => ({
  userService: { getMe: () => Promise.resolve({ profilePicture: null }) },
}));
jest.mock('../../services/chatService', () => ({
  chatService: { getUncelebratedMatches: jest.fn(), markMatchCelebrated: jest.fn(() => Promise.resolve()) },
}));

const mocked = chatService as jest.Mocked<typeof chatService>;

const philip = {
  matchId: 418, otherUserId: 20, otherUserName: 'Philip', otherUserProfilePicture: null,
  matchedAt: '2026-10-05T09:30:00Z', lastMessageContent: null, lastMessageSentAt: null,
  lastMessageSenderId: null, unreadCount: 0,
};

describe('PendingMatchCelebration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the match screen to the first liker and marks it seen', async () => {
    mocked.getUncelebratedMatches.mockResolvedValue([philip]);
    await render(<PendingMatchCelebration />);
    await act(async () => {});

    expect(screen.getByText('matching.discover.matchTitle')).toBeTruthy();
    expect(mocked.markMatchCelebrated).toHaveBeenCalledWith(418);
  });

  it('shows nothing when there is no match waiting', async () => {
    mocked.getUncelebratedMatches.mockResolvedValue([]);
    await render(<PendingMatchCelebration />);
    await act(async () => {});

    expect(screen.queryByText('matching.discover.matchTitle')).toBeNull();
    expect(mocked.markMatchCelebrated).not.toHaveBeenCalled();
  });
});
