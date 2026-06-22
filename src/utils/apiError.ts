import { AxiosError } from 'axios';

export const getApiError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;
    if (message) return message;
    switch (error.response?.status) {
      case 401: return 'Invalid credentials.';
      case 403: return 'Please verify your email before logging in.';
      case 409: return 'Email already in use.';
      case 400: return 'Invalid request. Please check your details.';
    }
  }
  return 'Something went wrong. Please try again.';
};