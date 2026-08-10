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

api.interceptors.response.use(
  res => res,
  err => {
    if (__DEV__) {
      console.error('[API ERROR]', err?.response?.status, err?.config?.url, JSON.stringify(err?.response?.data));
    }
    return Promise.reject(err);
  }
);

export default api;