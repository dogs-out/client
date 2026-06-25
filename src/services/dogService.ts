import api from './api';

export interface Dog {
  id: number;
  name: string;
  breed: string | null;
  age: number | null;
  bio: string | null;
  profilePicture: string | null;
  ownerId: number;
  ownerName: string;
  createdAt: string;
}

export interface DogPayload {
  name: string;
  breed?: string;
  age?: number;
  bio?: string;
  profilePicture?: string;
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

  uploadImage: async (uri: string): Promise<string> => {
    const formData = new FormData();
    const filename = uri.split('/').pop() ?? 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('file', { uri, name: filename, type } as unknown as Blob);
    const res = await api.post<{ url: string }>('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url;
  },
};