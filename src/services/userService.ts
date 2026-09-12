import api from './api';
import { tokenStorage } from '../utils/tokenStorage';
import { MULTIPART_CONFIG, prepareForUpload } from './photoUpload';
import { celebration } from '../utils/celebration';

export type WalkStatus =
  | 'WALKING' | 'AT_THE_PARK' | 'SITTING' | 'AT_HOME' | 'ON_VACATION' | 'BUSY';

/** Mirrors WalkStatus.mayShareLocation on the server. */
export const STATUS_SHARES_LOCATION: Record<WalkStatus, boolean> = {
  WALKING: true, AT_THE_PARK: true, SITTING: true, ON_VACATION: true,
  AT_HOME: false, BUSY: false,
};

/** Mirrors WalkStatus.isOutAndAbout — who appears under Who's outside, and who may invite. */
export const STATUS_IS_OUT: Record<WalkStatus, boolean> = {
  WALKING: true, AT_THE_PARK: true, SITTING: true,
  ON_VACATION: false, AT_HOME: false, BUSY: false,
};

export interface WalkingFriend {
  userId: number;
  name: string;
  profilePicture: string | null;
  /** Their own dogs, or the one they are looking after when sitting. */
  dogNames: string[];
  status: WalkStatus;
  /** Null when they are out but chose not to share where. */
  latitude: number | null;
  longitude: number | null;
  /** Set when the point was picked on the map, so the row can name the place. */
  placeName: string | null;
  until: string;
  distanceKm: number;
}

/** A dog you may say you are looking after: one belonging to a match. */
export interface SittableDog {
  dogId: number;
  name: string;
  breed: string | null;
  profilePicture: string | null;
  ownerId: number;
  ownerName: string;
}

export interface UserPhoto {
  id: number;
  /** Full-size rendition, for carousels and full-bleed cards. */
  url: string;
  /** Small rendition, for avatars and list rows. */
  thumbUrl: string;
  sortOrder: number;
}

export interface UserProfile {
  id: number;
  email: string;
  name: string;
  dateOfBirth: string | null;
  bio: string | null;
  profilePicture: string | null;
  latitude: number | null;
  longitude: number | null;
  role: string;
  authProvider: string;
  lifestyleTags: string[];
  personalityTags: string[];
  relationshipStatus: string | null;
  hasDog: boolean;
  isSitter: boolean;
  lookingForSitter: boolean;
  sitterWeekdays: string[];
  sitterExperienceYears: number | null;
  sitterTags: string[];
  createdAt: string;
  photos: UserPhoto[];
  maxDistanceKm: number | null;
  /** False until the account has accepted the terms. */
  termsAccepted: boolean;
  /** Null when there is none, or when it has run out. */
  walkStatus: WalkStatus | null;
  walkStatusExpiresAt: string | null;
  walkStatusLatitude: number | null;
  walkStatusLongitude: number | null;
  walkStatusPlaceName: string | null;
  walkStatusDogId: number | null;
  /** Today is this user's birthday, or one of their dogs'. */
  celebratingToday: boolean;
  birthdayToday: boolean;
  /** Names of their dogs with a birthday today. */
  dogBirthdaysToday: string[];
  minAge: number | null;
  maxAge: number | null;
  minDogAge: number | null;
  maxDogAge: number | null;
  notificationsEnabled: boolean;
}

export interface UpdateProfilePayload {
  name?: string;
  bio?: string;
  dateOfBirth?: string;
  latitude?: number;
  longitude?: number;
  lifestyleTags?: string[];
  personalityTags?: string[];
  relationshipStatus?: string;
  hasDog?: boolean;
  isSitter?: boolean;
  lookingForSitter?: boolean;
  sitterWeekdays?: string[];
  sitterExperienceYears?: number;
  sitterTags?: string[];
  maxDistanceKm?: number | null;
  minAge?: number | null;
  maxAge?: number | null;
  minDogAge?: number | null;
  maxDogAge?: number | null;
}

export const userService = {
  /** Sets or clears the current status. Null status clears it. */
  setStatus: (body: {
    status: WalkStatus | null;
    hours?: number;
    latitude?: number;
    longitude?: number;
    placeName?: string;
    dogId?: number;
  }): Promise<UserProfile> => api.put<UserProfile>('/users/me/status', body).then(r => r.data),

  /** Matches who are out right now. */
  getWalkingFriends: (): Promise<WalkingFriend[]> =>
    api.get<WalkingFriend[]>('/users/walking').then(r => r.data),

  /** The dogs this account may say it is sitting: those belonging to its matches. */
  getSittableDogs: (): Promise<SittableDog[]> =>
    api.get<SittableDog[]>('/users/me/sittable-dogs').then(r => r.data),

  /** Tells matches you are out. Separate from setting the status, by design. */
  inviteMatchesToWalk: (): Promise<void> => api.post('/users/me/status/invite').then(() => {}),

  /** Records acceptance of the terms on the account. Idempotent server-side. */
  acceptTerms: (): Promise<void> => api.post('/users/me/terms').then(() => {}),

  /**
   * The signed-in user's profile.
   *
   * <p>Deliberately has one side effect: it refreshes the birthday flag the
   * floating background reads. This call already runs on most screen focuses, so
   * hanging the flag off it keeps every screen current without a second request
   * or a provider threaded through the auth screens.
   */
  getMe: (): Promise<UserProfile> =>
    api.get<UserProfile>('/users/me').then(r => {
      celebration.set({
        own: r.data.birthdayToday ?? false,
        dogNames: r.data.dogBirthdaysToday ?? [],
      });
      return r.data;
    }),
  updateProfile: (payload: UpdateProfilePayload): Promise<UserProfile> =>
    api.put<UserProfile>('/users/me', payload).then(r => r.data),
  /** Takes a local image URI from the picker; resizes and uploads it as multipart. */
  addPhoto: async (uri: string): Promise<UserPhoto> => {
    const form = await prepareForUpload(uri);
    const { data } = await api.post<UserPhoto>('/users/me/photos', form, MULTIPART_CONFIG);
    return data;
  },
  deletePhoto: (photoId: number): Promise<void> =>
    api.delete(`/users/me/photos/${photoId}`).then(() => {}),
  /** Persists photo order; the first id becomes the main photo / profile picture. */
  reorderPhotos: (photoIds: number[]): Promise<void> =>
    api.put('/users/me/photos/order', { photoIds }).then(() => {}),
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    // The server revokes all previous tokens and returns a fresh one
    const { data } = await api.put<{ token: string }>('/users/me/password', { currentPassword, newPassword });
    if (data?.token) await tokenStorage.set(data.token);
  },
  deleteAccount: (): Promise<void> =>
    api.delete('/users/me').then(() => {}),
};
