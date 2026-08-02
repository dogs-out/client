import api from './api';

export type PlaydateVisibility = 'PUBLIC' | 'MATCHES_ONLY' | 'INVITE_ONLY';
export type PlaydateMyStatus = 'HOST' | 'JOINED' | 'INVITED' | 'NONE';

export interface PlaydateParticipant {
  userId: number;
  name: string;
  profilePicture: string | null;
  status: 'HOST' | 'INVITED' | 'JOINED';
}

export interface Playdate {
  id: number;
  hostId: number;
  hostName: string;
  hostProfilePicture: string | null;
  title: string | null;
  description: string | null;
  parkName: string;
  address: string | null;
  latitude: number;
  longitude: number;
  startsAt: string;
  maxParticipants: number | null;
  visibility: PlaydateVisibility;
  status: 'ACTIVE' | 'CANCELLED';
  joinedCount: number;
  myStatus: PlaydateMyStatus;
  participants: PlaydateParticipant[] | null;
  /** Group-chat preview for the Chats screen; null unless you're HOST or JOINED. */
  lastMessageContent: string | null;
  lastMessageSentAt: string | null;
}

export interface PlaydateMessage {
  id: number;
  senderId: number;
  senderName: string;
  senderProfilePicture: string | null;
  content: string;
  sentAt: string;
}

export interface PlaceResult {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
}

export interface PlaydatePayload {
  title?: string;
  description?: string;
  parkName: string;
  address?: string;
  latitude: number;
  longitude: number;
  startsAt: string; // ISO-8601 UTC
  maxParticipants?: number | null;
}

export const playdateService = {
  getPlaydates: (): Promise<Playdate[]> =>
    api.get<Playdate[]>('/playdates').then(r => r.data),

  getPlaydate: (id: number): Promise<Playdate> =>
    api.get<Playdate>(`/playdates/${id}`).then(r => r.data),

  createPlaydate: (payload: PlaydatePayload & { visibility: PlaydateVisibility; inviteUserIds?: number[] }): Promise<Playdate> =>
    api.post<Playdate>('/playdates', payload).then(r => r.data),

  updatePlaydate: (id: number, payload: PlaydatePayload): Promise<Playdate> =>
    api.put<Playdate>(`/playdates/${id}`, payload).then(r => r.data),

  cancelPlaydate: (id: number): Promise<void> =>
    api.post(`/playdates/${id}/cancel`).then(() => {}),

  join: (id: number): Promise<Playdate> =>
    api.post<Playdate>(`/playdates/${id}/join`).then(r => r.data),

  leave: (id: number): Promise<void> =>
    api.post(`/playdates/${id}/leave`).then(() => {}),

  invite: (id: number, userIds: number[]): Promise<Playdate> =>
    api.post<Playdate>(`/playdates/${id}/invites`, { userIds }).then(r => r.data),

  getMessages: (id: number): Promise<PlaydateMessage[]> =>
    api.get<PlaydateMessage[]>(`/playdates/${id}/messages`).then(r => r.data),

  sendMessage: (id: number, content: string): Promise<PlaydateMessage> =>
    api.post<PlaydateMessage>(`/playdates/${id}/messages`, { content }).then(r => r.data),

  searchParks: (query: string, lat?: number, lng?: number): Promise<PlaceResult[]> =>
    api.get<PlaceResult[]>('/places/search', { params: { query, lat, lng } }).then(r => r.data),
};
