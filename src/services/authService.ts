import api from './api';

interface AuthResponse {
  token: string;
  email: string;
  name: string;
}

interface GoogleAuthPayload {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export const googleLogin = (payload: GoogleAuthPayload): Promise<AuthResponse> =>
  api.post<AuthResponse>('/auth/google', payload).then(r => r.data);