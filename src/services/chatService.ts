import api from './api';

export interface MatchSummary {
  matchId: number;
  otherUserId: number;
  otherUserName: string;
  otherUserProfilePicture: string | null;
  matchedAt: string;
  lastMessageContent: string | null;
  lastMessageSentAt: string | null;
  lastMessageSenderId: number | null;
  unreadCount: number;
}

export interface ChatMessage {
  id: number;
  senderId: number;
  content: string;
  sentAt: string;
  isRead: boolean;
}

export const chatService = {
  getMatches: (): Promise<MatchSummary[]> =>
    api.get<MatchSummary[]>('/matches').then(r => r.data),

  getMessages: (matchId: number): Promise<ChatMessage[]> =>
    api.get<ChatMessage[]>(`/chats/${matchId}/messages`).then(r => r.data),

  sendMessage: (matchId: number, content: string): Promise<ChatMessage> =>
    api.post<ChatMessage>(`/chats/${matchId}/messages`, { content }).then(r => r.data),
};
