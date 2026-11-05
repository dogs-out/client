import api from './api';
import { MULTIPART_CONFIG, prepareForUpload } from './photoUpload';

/** Dog things only; the server refuses anything else. */
export const LISTING_CATEGORIES = [
  'LEASH_COLLAR', 'BED', 'TOYS', 'FOOD', 'CRATE_TRANSPORT', 'CLOTHING', 'CARE', 'OTHER',
] as const;
export type ListingCategory = typeof LISTING_CATEGORIES[number];
export type ListingStatus = 'ACTIVE' | 'RESERVED' | 'SOLD';

export interface ListingPhoto { id: number; url: string; thumbUrl: string }

export interface Listing {
  id: number;
  title: string;
  description: string | null;
  /** Rappen; null means free. */
  priceRappen: number | null;
  category: ListingCategory;
  status: ListingStatus;
  photos: ListingPhoto[];
  sellerId: number;
  sellerName: string;
  sellerPicture: string | null;
  /** Whole km; -1 when unknown. */
  distanceKm: number;
  createdAt: string;
  mine: boolean;
  myConversationId: number | null;
  conversationCount: number;
}

export interface ListingPayload {
  title: string;
  description?: string;
  priceRappen: number | null;
  category: ListingCategory;
}

export interface ListingConversation {
  id: number;
  listingId: number;
  listingTitle: string;
  listingPhoto: string | null;
  listingStatus: ListingStatus;
  otherUserId: number;
  otherName: string;
  otherPicture: string | null;
  iAmSeller: boolean;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
}

export interface ListingMessage {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  sentAt: string;
}

export const marketService = {
  browse: (category?: ListingCategory): Promise<Listing[]> =>
    api.get<Listing[]>('/market', { params: category ? { category } : {} }).then(r => r.data),
  mine: (): Promise<Listing[]> => api.get<Listing[]>('/market/mine').then(r => r.data),
  get: (id: number): Promise<Listing> => api.get<Listing>(`/market/${id}`).then(r => r.data),
  create: (payload: ListingPayload): Promise<Listing> => api.post<Listing>('/market', payload).then(r => r.data),
  update: (id: number, payload: ListingPayload): Promise<Listing> =>
    api.put<Listing>(`/market/${id}`, payload).then(r => r.data),
  setStatus: (id: number, status: ListingStatus): Promise<Listing> =>
    api.put<Listing>(`/market/${id}/status`, { status }).then(r => r.data),
  remove: (id: number): Promise<void> => api.delete(`/market/${id}`).then(() => {}),
  addPhoto: async (id: number, uri: string): Promise<Listing> => {
    const form = await prepareForUpload(uri);
    return api.post<Listing>(`/market/${id}/photos`, form, MULTIPART_CONFIG).then(r => r.data);
  },
  deletePhoto: (id: number, photoId: number): Promise<Listing> =>
    api.delete<Listing>(`/market/${id}/photos/${photoId}`).then(r => r.data),
  report: (id: number, reason: string, message?: string): Promise<void> =>
    api.post(`/market/${id}/report`, { reason, message }).then(() => {}),

  openConversation: (listingId: number): Promise<ListingConversation> =>
    api.post<ListingConversation>(`/market/${listingId}/conversation`).then(r => r.data),
  conversations: (): Promise<ListingConversation[]> =>
    api.get<ListingConversation[]>('/market/conversations').then(r => r.data),
  conversation: (id: number): Promise<ListingConversation> =>
    api.get<ListingConversation>(`/market/conversations/${id}`).then(r => r.data),
  messages: (conversationId: number): Promise<ListingMessage[]> =>
    api.get<ListingMessage[]>(`/market/conversations/${conversationId}/messages`).then(r => r.data),
  send: (conversationId: number, content: string): Promise<ListingMessage> =>
    api.post<ListingMessage>(`/market/conversations/${conversationId}/messages`, { content }).then(r => r.data),
};

/** "CHF 25" / "CHF 12.50" / the word for free. */
export function formatPrice(rappen: number | null, freeLabel: string): string {
  if (rappen == null || rappen === 0) return freeLabel;
  const francs = rappen / 100;
  return `CHF ${Number.isInteger(francs) ? francs : francs.toFixed(2)}`;
}
