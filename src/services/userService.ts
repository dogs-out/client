import api from './api';

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
  createdAt: string;
}

export interface UpdateProfilePayload {
  name?: string;
  bio?: string;
  dateOfBirth?: string;
  latitude?: number;
  longitude?: number;
  profilePicture?: string;
}

export const userService = {
  getMe: (): Promise<UserProfile> =>
    api.get<UserProfile>('/users/me').then(r => r.data),
  updateProfile: (payload: UpdateProfilePayload): Promise<UserProfile> =>
    api.put<UserProfile>('/users/me', payload).then(r => r.data),
};