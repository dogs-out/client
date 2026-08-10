import api from './api';
import { tokenStorage } from '../utils/tokenStorage';
import { MULTIPART_CONFIG, prepareForUpload } from './photoUpload';

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
  getMe: (): Promise<UserProfile> =>
    api.get<UserProfile>('/users/me').then(r => r.data),
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
