import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

// 10s was too tight for this API's payloads. Photos are stored and returned as
// inline base64, so /discover is ~18 MB for 15 profiles and a dog/profile save
// uploads megabytes of it back. On a mid-speed connection either overruns 10s,
// and axios reports the abort as a network error — which the screens render as
// "Cannot reach the server", making a working backend look down.
// This is a mitigation, not the fix: the payload itself needs to shrink.
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