// Main entry point for MAL authentication module

// Re-export all public APIs
export { startAuthFlow, handleOAuthRedirect } from './oauth-flow';
export { logout } from './logout';
export { 
  isTokenValid, 
  isAuthenticated, 
  refreshAccessToken, 
  ensureValidToken, 
  getAuthHeaders 
} from './token-manager';
export { fetchUserInfo, getUserInfo } from './user-service';

// Re-export types
export type { MALUserInfo, MALTokenResponse } from './types';
