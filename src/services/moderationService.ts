import api from './api';

export interface BlockedUser {
  userId: number;
  name: string;
  profilePicture: string | null;
  blockedAt: string;
}

export const REPORT_REASONS = [
  'Inappropriate messages',
  'Harassment or bullying',
  'Spam or scam',
  'Fake profile',
  'Safety concern',
  'Other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export const moderationService = {
  blockUser: (userId: number): Promise<void> =>
    api.post(`/users/${userId}/block`).then(() => {}),

  unblockUser: (userId: number): Promise<void> =>
    api.delete(`/users/${userId}/block`).then(() => {}),

  getBlockedUsers: (): Promise<BlockedUser[]> =>
    api.get<BlockedUser[]>('/users/me/blocks').then(r => r.data),

  reportUser: (matchId: number, reason: string, message: string): Promise<void> =>
    api.post(`/matches/${matchId}/report`, { reason, message }).then(() => {}),

  unmatch: (matchId: number): Promise<void> =>
    api.delete(`/matches/${matchId}`).then(() => {}),
};
