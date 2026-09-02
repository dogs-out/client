import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

// Raised from 10s when photos were inline base64 and /discover was ~18 MB, which
// overran the timeout on a normal connection and surfaced as "Cannot reach the
// server" against a healthy backend. Photos are URLs now and the feed is a few KB,
// so that pressure is gone — but this still covers the one genuinely large request
// left, a photo upload on a slow mobile connection.
const REQUEST_TIMEOUT_MS = 30000;

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080',
  timeout: REQUEST_TIMEOUT_MS,
});

api.interceptors.request.use(async config => {
  const isAuthEndpoint = config.url?.startsWith('/auth/');
  if (!isAuthEndpoint) {
    const token = await tokenStorage.get();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (__DEV__) {
      console.log('[API]', config.method?.toUpperCase(), config.url, token ? 'WITH token' : 'NO token');
    }
  }
  return config;
});

/**
 * The server hands back a renewed token once the current one is a day old, and
 * this is where it gets picked up. Without it a session would still die on the
 * token's own expiry — which is how everyone ended up logging in again every
 * morning, back when that expiry was 24 hours.
 */
const REFRESHED_TOKEN_HEADER = 'x-refreshed-token';

api.interceptors.response.use(
  res => {
    const renewed = res.headers?.[REFRESHED_TOKEN_HEADER];
    if (typeof renewed === 'string' && renewed.length > 0) {
      // Fire and forget: the in-memory cache updates synchronously inside set(),
      // so the next request already carries the new token even if the Keychain
      // write is still in flight.
      tokenStorage.set(renewed).catch(() => { /* keep using the old token */ });
    }
    return res;
  },
  err => {
    if (__DEV__) {
      console.error('[API ERROR]', err?.response?.status, err?.config?.url, JSON.stringify(err?.response?.data));
    }
    return Promise.reject(err);
  }
);

export default api;