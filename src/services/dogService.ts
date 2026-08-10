import api from './api';
import { MULTIPART_CONFIG, prepareForUpload } from './photoUpload';

export interface DogPhoto {
  id: number;
  /** Full-size rendition, for carousels and full-bleed cards. */
  url: string;
  /** Small rendition, for avatars and list rows. */
  thumbUrl: string;
  sortOrder: number;
}

export interface Dog {
  id: number;
  name: string;
  breed: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  profilePicture: string | null;
  ownerId: number;
  ownerName: string;
  ownerProfilePicture: string | null;
  createdAt: string;
  energyLevel: number | null;
  socialBehavior: string | null;
  loves: string[];
  offLeash: string | null;
  kidsComfort: number | null;
  tags: string[];
  photos: DogPhoto[];
}

export interface DogPayload {
  name: string;
  breed?: string;
  dateOfBirth?: string;
  bio?: string;
  energyLevel?: number;
  socialBehavior?: string;
  loves?: string[];
  offLeash?: string;
  kidsComfort?: number;
  tags?: string[];
}

export const dogService = {
  createDog: (payload: DogPayload): Promise<Dog> =>
    api.post<Dog>('/dogs', payload).then(r => r.data),

  getMyDogs: (): Promise<Dog[]> =>
    api.get<Dog[]>('/dogs/me').then(r => r.data),

  getDog: (id: number): Promise<Dog> =>
    api.get<Dog>(`/dogs/${id}`).then(r => r.data),

  updateDog: (id: number, payload: Partial<DogPayload>): Promise<Dog> =>
    api.put<Dog>(`/dogs/${id}`, payload).then(r => r.data),

  deleteDog: (id: number): Promise<void> =>
    api.delete(`/dogs/${id}`).then(() => undefined),

  /** Takes a local image URI from the picker; resizes and uploads it as multipart. */
  addPhoto: async (dogId: number, uri: string): Promise<DogPhoto> => {
    const form = await prepareForUpload(uri);
    const { data } = await api.post<DogPhoto>(`/dogs/${dogId}/photos`, form, MULTIPART_CONFIG);
    return data;
  },

  deletePhoto: (dogId: number, photoId: number): Promise<void> =>
    api.delete(`/dogs/${dogId}/photos/${photoId}`).then(() => undefined),

  /** Persists photo order; the first id becomes the main photo / profile picture. */
  reorderPhotos: (dogId: number, photoIds: number[]): Promise<void> =>
    api.put(`/dogs/${dogId}/photos/order`, { photoIds }).then(() => undefined),
};