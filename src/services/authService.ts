import api from './api';

export interface AuthResponse {
  token: string;
  email: string;
  name: string;
  isNewUser: boolean;
}

export interface MessageResponse {
  message: string;
}

export interface GoogleAuthPayload {
  code: string;
  codeVerifier: string;
  redirectUri: string;
  clientId: string;
}

export const authService = {
  register: (email: string, name: string, password: string): Promise<MessageResponse> =>
    api.post<MessageResponse>('/auth/register', { email, name, password }).then(r => r.data),

  verifyEmail: (email: string, code: string): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/verify-email', { email, code }).then(r => r.data),

  login: (email: string, password: string): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/login', { email, password }).then(r => r.data),

  forgotPassword: (email: string): Promise<MessageResponse> =>
    api.post<MessageResponse>('/auth/forgot-password', { email }).then(r => r.data),

  resetPassword: (token: string, newPassword: string): Promise<MessageResponse> =>
    api.post<MessageResponse>('/auth/reset-password', { token, newPassword }).then(r => r.data),

  googleAuth: (payload: GoogleAuthPayload): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/google', payload).then(r => r.data),

  /**
   * @param fullName name from the Apple credential. Apple only provides it on the
   *   user's first authorization and never again, so it has to be forwarded then or
   *   the account keeps a name derived from the email address forever. The server
   *   uses it for display only — identity always comes from the signed token.
   */
  appleAuth: (identityToken: string, fullName?: string): Promise<AuthResponse> =>
    api.post<AuthResponse>('/auth/apple', { identityToken, fullName }).then(r => r.data),
};