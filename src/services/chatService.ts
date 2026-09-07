import api from './api';
import { unreadStore } from './unreadStore';

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

  /** Also marks everything addressed to you in this chat as read, server-side. */
  getMessages: (matchId: number): Promise<ChatMessage[]> =>
    api.get<ChatMessage[]>(`/chats/${matchId}/messages`).then(r => {
      // The read just happened; the tab badge is now stale by exactly this chat.
      unreadStore.changed();
      return r.data;
    }),

  sendMessage: (matchId: number, content: string): Promise<ChatMessage> =>
    api.post<ChatMessage>(`/chats/${matchId}/messages`, { content }).then(r => r.data),
};
