import api from './api';

export interface DogPhoto {
  id: number;
  imageData: string;
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
  profilePicture?: string;
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

  addPhoto: (dogId: number, imageData: string): Promise<DogPhoto> =>
    api.post<DogPhoto>(`/dogs/${dogId}/photos`, { imageData }).then(r => r.data),

  deletePhoto: (dogId: number, photoId: number): Promise<void> =>
    api.delete(`/dogs/${dogId}/photos/${photoId}`).then(() => undefined),

  pickImageAsBase64: async (uri: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(xhr.response);
      };
      xhr.onerror = reject;
      xhr.open('GET', uri);
      xhr.responseType = 'blob';
      xhr.send();
    });
  },
};