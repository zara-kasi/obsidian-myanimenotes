// Type definitions for SIMKL authentication

export interface SimklUserInfo {
  id: number;
  name: string;
  picture?: string;
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
