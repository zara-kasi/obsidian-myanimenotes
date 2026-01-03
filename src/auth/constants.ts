// MAL API endpoints and configuration

/**
 * The URL for the initial user authorization step.
 * Users are redirected here to log in to MyAnimeList and approve the app.
 */
export const MAL_AUTH_URL = "https://myanimelist.net/v1/oauth2/authorize";

/**
 * The URL for exchanging authorization codes for access/refresh tokens.
 * Also used for refreshing expired access tokens.
 */
export const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";

/**
 * The URL for fetching the authenticated user's profile information.
 * Returns basic details like ID, name, and avatar.
 */
export const MAL_USER_URL = "https://api.myanimelist.net/v2/users/@me";

/**
 * The custom URI scheme registered by the plugin to handle OAuth callbacks.
 * When MAL redirects to this URI, Obsidian intercepts it and triggers the 'handleOAuthRedirect' flow.
 */
export const REDIRECT_URI = "obsidian://myanimenotes-auth/mal";

// Token expiry buffer (5 minutes in milliseconds)
/**
 * A safety buffer (5 minutes) subtracted from the actual token expiry time.
 * Used to proactively refresh the token before it actually expires to prevent
 * request failures during network latency or long operations.
 */
export const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;

export const DEFAULT_MAL_CLIENT_ID = "a4e5efc1169f4748557b836db6d1fa13";

/** * Auth state timeout: 10 minutes.
 * If the user doesn't complete the login within this time, the state expires
 * to prevent replay attacks or stale sessions.
 */
export const AUTH_STATE_TIMEOUT_MS = 10 * 60 * 1000;
