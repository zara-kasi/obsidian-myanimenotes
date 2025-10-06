// SIMKL API endpoints and configuration

export const SIMKL_AUTH_URL = 'https://simkl.com/oauth/authorize';
export const SIMKL_TOKEN_URL = 'https://api.simkl.com/oauth/token';
export const SIMKL_USER_URL = 'https://api.simkl.com/users/settings';
export const REDIRECT_URI = 'obsidian://cassette-auth/simkl';

// Token expiry buffer (5 minutes in milliseconds)
export const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000;