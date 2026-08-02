import { AxiosError } from 'axios';
import i18next from 'i18next';

/** Status codes we have a specific, user-facing sentence for. */
const STATUS_KEYS: Record<number, string> = {
  400: 'errors.badRequest',
  401: 'errors.invalidCredentials',
  403: 'errors.forbidden',
  404: 'errors.notFound',
  409: 'errors.emailTaken',
  429: 'errors.tooManyAttempts',
  500: 'errors.server',
};

/**
 * Reads whatever message the server sent. Spring Boot returns `{ message }`,
 * `{ detail }` (ProblemDetail/RFC 7807), `{ error }`, or a bare string.
 */
function serverMessage(data: unknown): string | null {
  if (typeof data === 'string') return data.length < 300 ? data : null;
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  for (const key of ['message', 'detail', 'error'] as const) {
    const value = d[key];
    if (typeof value === 'string' && value) return value;
  }
  return null;
}

export const getApiError = (error: unknown): string => {
  if (!(error instanceof AxiosError)) return i18next.t('errors.unknown');

  if (!error.response) {
    // A timed-out request and an unreachable host both land here with no
    // response, but they mean different things to the user — and the payloads
    // are large enough (~18 MB discover feed, multi-MB photo uploads) that a
    // slow connection trips the timeout against a perfectly healthy server.
    // Telling that user the backend is down sends them chasing nothing.
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    return i18next.t(timedOut ? 'errors.timeout' : 'errors.network');
  }

  if (__DEV__) {
    console.warn('[API Error]', error.response.status, JSON.stringify(error.response.data));
  }

  // The server's own wording is more specific than anything inferred from the
  // status, so it wins when present. It is English-only — see errors.note.
  const fromServer = serverMessage(error.response.data);
  if (fromServer) return fromServer;

  const key = STATUS_KEYS[error.response.status];
  return key
    ? i18next.t(key)
    : i18next.t('errors.requestFailed', { status: error.response.status });
};
