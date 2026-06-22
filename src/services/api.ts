import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080',
  timeout: 10000,
});

api.interceptors.request.use(async config => {
  const token = await tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;