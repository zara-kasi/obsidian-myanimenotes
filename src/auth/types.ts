// Type definitions for MAL authentication

/**
 * Represents the authenticated user's minimal profile information.
 * Stored in plugin settings to display the current user in the UI.
 */
export interface MALUserInfo {
  /** The unique numeric ID of the user on MyAnimeList. */
  id: number;
  /** The user's username. */
  name: string;
  /** URL to the user's profile picture (optional). */
  picture?: string;
}

/**
 * Represents the JSON response from the MyAnimeList Token Endpoint.
 * Standard OAuth 2.0 response format.
 */
export interface MALTokenResponse {
  /** The short-lived token used to authenticate API requests. */
  access_token: string;
  /** The long-lived token used to obtain new access tokens when they expire. */
  refresh_token: string;
  /** The duration in seconds until the access token expires (typically 1 month for MAL). */
  expires_in: number;
  /** The type of token (always "Bearer"). */
  token_type: string;
}

/**
 * Represents the temporary authentication state saved during the PKCE flow.
 * Persisted to settings to survive the browser redirect loop.
 */
export interface MALAuthState {
  /** The PKCE code verifier (secret) needed to complete the token exchange. */
  verifier: string;
  /** The random state string used to prevent CSRF attacks. */
  state: string;
}

/**
 * Represents the query parameters received in the OAuth redirect callback.
 * Can be parsed from a raw URL string or an object depending on the protocol handler.
 */
export interface OAuthParams {
  /** The authorization code returned by MAL (if successful). */
  code?: string;
  /** The state returned by MAL (must match the sent state). */
  state?: string;
  /** Error code string if the request failed (e.g., "access_denied"). */
  error?: string;
  /** Human-readable description of the error. */
  error_description?: string;
  /** The full redirect URL (sometimes passed raw by Obsidian). */
  url?: string;
  /** Index signature for flexibility with URLSearchParams. */
  [key: string]: string | undefined;
}
