// Type definitions for MAL authentication

export interface MALUserInfo {
  id: number;
  name: string;
  picture?: string;
}

export interface MALTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface MALAuthState {
  verifier: string;
  state: string;
}


export interface OAuthParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
  url?: string;
}

// If you need additional properties, define them explicitly:
export interface OAuthParamsExtended extends OAuthParams {
  [key: string]: string | undefined;
}
