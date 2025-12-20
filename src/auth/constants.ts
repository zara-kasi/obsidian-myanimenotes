// MAL API endpoints and configuration

export const MAL_AUTH_URL = 'https://myanimelist.net/v1/oauth2/authorize';
export const MAL_TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';
export const MAL_USER_URL = 'https://api.myanimelist.net/v2/users/@me';
export const REDIRECT_URI = 'obsidian://myanimenotes-auth/mal';

// Token expiry buffer (5 minutes in milliseconds)
export const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;
