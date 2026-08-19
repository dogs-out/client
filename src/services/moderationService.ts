import api from './api';

export interface BlockedUser {
  userId: number;
  name: string;
  profilePicture: string | null;
  blockedAt: string;
}

/**
 * Sent to the API as these exact English strings and translated only for display,
 * so the wording here is also what lands in the moderation email.
 *
 * "Child safety" is deliberately its own reason rather than being folded into
 * "Safety concern": the published child safety standards promise a way to report
 * it, and a report that names it explicitly can be triaged ahead of the queue
 * instead of being read first to find out how urgent it is.
 */
export const REPORT_REASONS = [
  'Inappropriate messages',
  'Harassment or bullying',
  'Spam or scam',
  'Fake profile',
  'Safety concern',
  'Child safety',
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
