import api from './api';

export interface Shelter {
  id: string;
  country: 'CH' | 'AT' | 'DE';
  /** Canton or Bundesland, in its own language. */
  region: string;
  name: string;
  town: string;
  website: string;
  /** Town-level, for sorting by distance only. */
  latitude: number;
  longitude: number;
  /** The region has no shelter of its own; this is its neighbour's. */
  coversNeighbour?: boolean | null;
  /** "YYYY-MM" while temporarily closed. */
  closedUntil?: string | null;
}

export const shelterService = {
  list: (): Promise<Shelter[]> => api.get<Shelter[]>('/shelters').then(r => r.data),
};
