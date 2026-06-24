import { AxiosError } from 'axios';

export const getApiError = (error: unknown): string => {
  if (error instanceof AxiosError) {
    if (!error.response) return 'Cannot reach the server. Make sure the backend is running.';

    const data = error.response.data as Record<string, unknown> | string | undefined;

    // Spring Boot can return { message: "..." }, { detail: "..." } (ProblemDetail RFC 7807),
    // { error: "..." }, or a plain string
    const d = data as Record<string, unknown>;
    const bodyMessage =
      typeof data === 'string' && data.length < 300 ? data
        : typeof d?.message === 'string' && d.message ? (d.message as string)
        : typeof d?.detail  === 'string' && d.detail  ? (d.detail  as string)
        : typeof d?.error   === 'string' && d.error   ? (d.error   as string)
        : null;

    if (__DEV__) {
      console.warn('[API Error]', error.response.status, JSON.stringify(error.response.data));
    }

    if (bodyMessage) return bodyMessage;

    switch (error.response.status) {
      case 400: return 'Invalid request. Please check your details.';
      case 401: return 'Incorrect email or password.';
      case 403: return 'Access denied. Please sign in again.';
      case 404: return 'No account found with that email.';
      case 409: return 'An account with this email already exists.';
      case 429: return 'Too many attempts. Please wait a moment and try again.';
      case 500: return 'Server error. Please try again later.';
    }

    return `Request failed (${error.response.status}).`;
  }
  return 'Something went wrong. Please try again.';
};