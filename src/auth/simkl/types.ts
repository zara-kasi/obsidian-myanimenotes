// Type definitions for SIMKL authentication

export interface SimklUserInfo {
  user?: {
    name: string;
    id?: number;
  };
  account?: {
    id: number;
    timezone: string;
  };
}

export interface SimklPinResponse {
  user_code: string;
  verification_url?: string;
  expires_in?: number;
  interval?: number;
}

export interface SimklTokenResponse {
  access_token: string;
  token_type?: string;
  scope?: string;
}

export interface SimklAuthState {
  userCode: string;
  interval: number;
  expiresIn: number;
}