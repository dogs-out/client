import api from './api';
import { DiscoverProfile } from './discoverService';

/** An owner asking for a sitter for a particular window of time. */
export interface SittingRequest {
  id: number;
  ownerId: number;
  ownerName: string;
  ownerProfilePicture: string | null;
  startsAt: string;
  endsAt: string;
  /** Which dogs, by name — one calm terrier and three is not the same job. */
  dogs: string[];
  note: string | null;
  status: 'OPEN' | 'CLOSED';
  /** True when the reader posted it, so the row offers managing instead of offering. */
  mine: boolean;
  /** Who got the job, or null while it is still open. */
  sitterId: number | null;
  sitterName: string | null;
  sitterProfilePicture: string | null;
  /** The window has passed: off the board, and greyed in the owner's own list. */
  over: boolean;
  /** The reader may still change it — their own, not taken, not over. */
  canEdit: boolean;
  /** Over, somebody sat, and the owner has not rated them yet. */
  awaitingReview: boolean;
  /** Which dogs, by id, so the edit screen can preselect them. */
  dogIds: number[];
  /** The handover details. Only ever sent to the owner and the accepted sitter. */
  todoList: string | null;
  emergencyPhone: string | null;
  addressLabel: string | null;
  addressLatitude: number | null;
  addressLongitude: number | null;
  /** True once the owner has handed them over, so the card can say "updated". */
  detailsShared: boolean;
  /** Rounded; -1 when either side has no location. */
  distanceKm: number;
}

/** What an owner thought of a sitter, once the sitting was over. */
export interface SitterReview {
  id: number;
  sitterId: number;
  raterId: number;
  raterName: string;
  raterProfilePicture: string | null;
  stars: number;
  /** Null when none was written, or when it has been hidden pending moderation. */
  comment: string | null;
  tags: string[];
  mine: boolean;
  createdAt: string;
}

/**
 * A sitter's cancellation record, so the app can warn before a penalty lands
 * rather than after it.
 */
export interface SitterStanding {
  lateCancellations: number;
  strikesAllowed: number;
  lateHours: number;
  /** Null unless a suspension is currently running. */
  blockedUntil: string | null;
}

export interface SitterRating {
  /** Rounded to one decimal; 0 when there are none yet. */
  average: number;
  count: number;
}

export const sitterService = {
  /** Users who toggled "I'm looking for a dogsitter", distance-sorted — a sitter's jobs. */
  getSeekers: (): Promise<DiscoverProfile[]> =>
    api.get<DiscoverProfile[]>('/sitters/seekers').then(r => r.data),

  /**
   * Users who toggled "I'm a dogsitter", distance-sorted — who an owner can ask.
   *
   * <p>Weekdays narrow it to sitters free on any one of them, which is what
   * picking several means: "Monday and Friday" is two days to cover, not one
   * sitter who must do both. Sitters who named no days stay in the list —
   * silence means "ask me", not "never".
   *
   * <p>Sent comma-separated. Spring binds that to a list without any custom
   * serialiser, whereas axios' default array encoding (`weekday[]=`) would not.
   */
  getAvailableSitters: (weekdays?: readonly string[] | null): Promise<DiscoverProfile[]> =>
    api.get<DiscoverProfile[]>('/sitters/available', {
      params: weekdays && weekdays.length > 0 ? { weekday: weekdays.join(',') } : undefined,
    }).then(r => r.data),

  /** Opens a chat with an owner from the seeker pool (idempotent). */
  contact: (targetUserId: number): Promise<{ matchId: number }> =>
    api.post<{ matchId: number }>('/sitters/contact', { targetUserId }).then(r => r.data),

  /** Open jobs any sitter can still take, soonest first. */
  getOpenRequests: (): Promise<SittingRequest[]> =>
    api.get<SittingRequest[]>('/sitters/requests').then(r => r.data),

  /** What this account has posted, open or closed. */
  getMyRequests: (): Promise<SittingRequest[]> =>
    api.get<SittingRequest[]>('/sitters/requests/mine').then(r => r.data),

  createRequest: (body: {
    startsAt: string;
    endsAt: string;
    dogIds: number[];
    note?: string;
  }): Promise<SittingRequest> =>
    api.post<SittingRequest>('/sitters/requests', body).then(r => r.data),

  /** Closes a request once someone has been found. Only the owner may. */
  closeRequest: (id: number): Promise<SittingRequest> =>
    api.put<SittingRequest>(`/sitters/requests/${id}/close`, {}).then(r => r.data),

  /** Changes a request nobody has taken yet. Only the owner, and only until accepted. */
  updateRequest: (id: number, body: {
    startsAt: string;
    endsAt: string;
    dogIds: number[];
    note?: string;
  }): Promise<SittingRequest> =>
    api.put<SittingRequest>(`/sitters/requests/${id}`, body).then(r => r.data),

  /**
   * A sitter offering to take a job. Opens the chat and posts the offer into it,
   * so the answer is a conversation rather than a form.
   */
  offer: (id: number, message?: string): Promise<{ matchId: number }> =>
    api.post<{ matchId: number }>(`/sitters/requests/${id}/offer`, { message }).then(r => r.data),

  /** The owner accepting an offer; takes the job off everyone else's board. */
  accept: (id: number, sitterId: number): Promise<SittingRequest> =>
    api.put<SittingRequest>(`/sitters/requests/${id}/accept`, { sitterId }).then(r => r.data),

  /** Jobs this account was accepted for, as the sitter. */
  getAcceptedJobs: (): Promise<SittingRequest[]> =>
    api.get<SittingRequest[]>('/sitters/requests/accepted').then(r => r.data),

  // ─── Reviews ────────────────────────────────────────────────────────────────

  /** Sittings this owner still owes a rating for, so the app can prompt. */
  getPendingReviews: (): Promise<SittingRequest[]> =>
    api.get<SittingRequest[]>('/sitters/reviews/pending').then(r => r.data),

  /** The highlight tags on offer, from the server so the client never invents one. */
  getReviewTags: (): Promise<string[]> =>
    api.get<string[]>('/sitters/reviews/tags').then(r => r.data),

  submitReview: (body: {
    requestId: number;
    stars: number;
    comment?: string;
    tags?: string[];
  }): Promise<SitterReview> =>
    api.post<SitterReview>('/sitters/reviews', body).then(r => r.data),

  getReviews: (sitterId: number): Promise<SitterReview[]> =>
    api.get<SitterReview[]>(`/sitters/${sitterId}/reviews`).then(r => r.data),

  getRating: (sitterId: number): Promise<SitterRating> =>
    api.get<SitterRating>(`/sitters/${sitterId}/rating`).then(r => r.data),

  // ─── Cancelling and handover ────────────────────────────────────────────────

  /** The sitter giving a job back; it returns to the board for someone else. */
  cancelAsSitter: (id: number, reason?: string): Promise<SittingRequest> =>
    api.put<SittingRequest>(`/sitters/requests/${id}/cancel`, { reason }).then(r => r.data),

  /** This account's cancellation record, for the warning before confirming. */
  getStanding: (): Promise<SitterStanding> =>
    api.get<SitterStanding>('/sitters/standing').then(r => r.data),

  /** The owner handing over the to-do list, emergency number and address. */
  shareDetails: (id: number, body: {
    todoList?: string;
    emergencyPhone?: string;
    addressLabel?: string;
    addressLatitude?: number;
    addressLongitude?: number;
  }): Promise<SittingRequest> =>
    api.put<SittingRequest>(`/sitters/requests/${id}/details`, body).then(r => r.data),
};
