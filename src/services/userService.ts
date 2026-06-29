import api from './api';

export interface UserPhoto {
  id: number;
  imageData: string;
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
  createdAt: string;
  photos: UserPhoto[];
}

export interface UpdateProfilePayload {
  name?: string;
  bio?: string;
  dateOfBirth?: string;
  latitude?: number;
  longitude?: number;
  profilePicture?: string;
  lifestyleTags?: string[];
  personalityTags?: string[];
  relationshipStatus?: string;
}

export const userService = {
  getMe: (): Promise<UserProfile> =>
    api.get<UserProfile>('/users/me').then(r => r.data),
  updateProfile: (payload: UpdateProfilePayload): Promise<UserProfile> =>
    api.put<UserProfile>('/users/me', payload).then(r => r.data),
  addPhoto: (imageData: string): Promise<UserPhoto> =>
    api.post<UserPhoto>('/users/me/photos', { imageData }).then(r => r.data),
  deletePhoto: (photoId: number): Promise<void> =>
    api.delete(`/users/me/photos/${photoId}`).then(() => {}),
  deleteAccount: (): Promise<void> =>
    api.delete('/users/me').then(() => {}),
};
