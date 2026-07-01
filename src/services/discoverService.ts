import api from './api';
import { Dog } from './dogService';
import { UserPhoto } from './userService';

export interface DiscoverProfile {
  userId: number;
  name: string;
  dateOfBirth: string | null;
  bio: string | null;
  profilePicture: string | null;
  photos: UserPhoto[];
  lifestyleTags: string[];
  personalityTags: string[];
  relationshipStatus: string | null;
  dogs: Dog[];
  distanceKm: number;
}

export interface SwipeResponse {
  match: boolean;
  matchId: number;
}

export const discoverService = {
  getFeed: (): Promise<DiscoverProfile[]> =>
    api.get<DiscoverProfile[]>('/discover').then(r => r.data),

  swipe: (targetUserId: number, action: 'LIKE' | 'PASS'): Promise<SwipeResponse> =>
    api.post<SwipeResponse>('/matches/swipe', { targetUserId, action }).then(r => r.data),
};
