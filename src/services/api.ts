import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080',
  timeout: 10000,
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