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

export interface SimklTokenResponse {
  access_token: string;
  token_type?: string;
  scope?: string;
}

export interface SimklAuthState {
  state: string;
}

export interface OAuthParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
  url?: string;
  [key: string]: any;
}