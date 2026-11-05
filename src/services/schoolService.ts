import api from './api';
import { MULTIPART_CONFIG, prepareForUpload } from './photoUpload';

export type SchoolStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface EventPhoto { id: number; url: string; thumbUrl: string }

export interface SchoolEvent {
  id: number;
  schoolId: number;
  schoolName: string;
  schoolLogo: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  placeName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Rappen per dog; null means free. */
  priceRappen: number | null;
  maxParticipants: number | null;
  participantCount: number;
  joined: boolean;
  mine: boolean;
  cancelled: boolean;
  distanceKm: number;
  photos: EventPhoto[];
  /** A weekly course's days ("TUESDAY"); empty for a one-off. startsAt is then the first class, endsAt the end of the last. */
  repeatWeekdays?: string[];
  occurrenceMinutes?: number | null;
  /** The next class (or the event itself); null once over. */
  nextStartsAt?: string | null;
  /** Weekly events: 'DATE' (pick classes) or 'COURSE' (all at once); null for a one-off. */
  signupMode?: SignupMode | null;
  /** The next classes (up to 8); per-class places in DATE mode. */
  occurrences?: EventOccurrence[];
  /** COURSE mode: how many classes signing up commits to. */
  remainingClasses?: number;
}

export type SignupMode = 'DATE' | 'COURSE';

export interface EventOccurrence {
  /** YYYY-MM-DD */
  date: string;
  startsAt: string;
  participantCount: number;
  joined: boolean;
  full: boolean;
}

export interface DogSchool {
  id: number;
  name: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  openingHours: string | null;
  logo: string | null;
  /** Anything but APPROVED is only ever seen by the owner. */
  status: SchoolStatus;
  reviewNote: string | null;
  distanceKm: number;
  mine: boolean;
  upcomingEvents: SchoolEvent[];
}

export interface SchoolPayload {
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  website?: string;
  openingHours?: string;
}

export interface EventPayload {
  title: string;
  description?: string;
  startsAt: string;
  /** For a course, the end of the first class. */
  endsAt: string;
  placeName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  priceRappen: number | null;
  maxParticipants?: number;
  /** A weekly course: its weekdays and last day (YYYY-MM-DD). */
  repeatWeekdays?: string[];
  repeatUntil?: string;
  signupMode?: SignupMode;
}

/** occurrenceDate: the class signed up for; null for a whole course or a one-off. */
export interface EventParticipant {
  userId: number; name: string; profilePicture: string | null; joinedAt: string; occurrenceDate: string | null;
}

export const schoolService = {
  nearby: (): Promise<DogSchool[]> => api.get<DogSchool[]>('/schools').then(r => r.data),
  /** Null when this account runs no school (the server answers 204). */
  mine: (): Promise<DogSchool | null> => api.get<DogSchool>('/schools/mine').then(r => (r.status === 204 ? null : r.data)),
  get: (id: number): Promise<DogSchool> => api.get<DogSchool>(`/schools/${id}`).then(r => r.data),
  register: (payload: SchoolPayload): Promise<DogSchool> => api.post<DogSchool>('/schools', payload).then(r => r.data),
  update: (payload: SchoolPayload): Promise<DogSchool> => api.put<DogSchool>('/schools/mine', payload).then(r => r.data),
  deleteMine: (): Promise<void> => api.delete('/schools/mine').then(() => {}),
  report: (id: number, reason: string, message?: string): Promise<void> =>
    api.post(`/schools/${id}/report`, { reason, message }).then(() => {}),
  setLogo: async (uri: string): Promise<DogSchool> => {
    const form = await prepareForUpload(uri);
    return api.put<DogSchool>('/schools/mine/logo', form, MULTIPART_CONFIG).then(r => r.data);
  },

  events: (): Promise<SchoolEvent[]> => api.get<SchoolEvent[]>('/school-events').then(r => r.data),
  event: (id: number): Promise<SchoolEvent> => api.get<SchoolEvent>(`/school-events/${id}`).then(r => r.data),
  createEvent: (payload: EventPayload): Promise<SchoolEvent> =>
    api.post<SchoolEvent>('/school-events', payload).then(r => r.data),
  updateEvent: (id: number, payload: EventPayload): Promise<SchoolEvent> =>
    api.put<SchoolEvent>(`/school-events/${id}`, payload).then(r => r.data),
  cancelEvent: (id: number): Promise<void> => api.delete(`/school-events/${id}`).then(() => {}),
  addEventPhoto: async (id: number, uri: string): Promise<SchoolEvent> => {
    const form = await prepareForUpload(uri);
    return api.post<SchoolEvent>(`/school-events/${id}/photos`, form, MULTIPART_CONFIG).then(r => r.data);
  },
  deleteEventPhoto: (id: number, photoId: number): Promise<SchoolEvent> =>
    api.delete<SchoolEvent>(`/school-events/${id}/photos/${photoId}`).then(r => r.data),
  /** `date` (YYYY-MM-DD) for one class of a per-date event; left out otherwise. */
  join: (id: number, date?: string): Promise<SchoolEvent> =>
    api.post<SchoolEvent>(`/school-events/${id}/join`, date ? { date } : {}).then(r => r.data),
  leave: (id: number, date?: string): Promise<SchoolEvent> =>
    api.delete<SchoolEvent>(`/school-events/${id}/join`, { params: date ? { date } : {} }).then(r => r.data),
  /** The school calling off one class. */
  cancelDate: (id: number, date: string): Promise<SchoolEvent> =>
    api.post<SchoolEvent>(`/school-events/${id}/cancel-date`, { date }).then(r => r.data),
  participants: (id: number): Promise<EventParticipant[]> =>
    api.get<EventParticipant[]>(`/school-events/${id}/participants`).then(r => r.data),
};
