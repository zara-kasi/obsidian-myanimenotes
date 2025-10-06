// Main entry point for SIMKL authentication module

// Re-export all public APIs
export { startAuthFlow, handleOAuthRedirect } from './oauth-flow';
export { logout } from './logout';
export { 
  isTokenValid, 
  isAuthenticated, 
  ensureValidToken, 
  getAuthHeaders,
  hasRequiredCredentials
} from './token-manager';
export { 
  fetchUserInfo, 
  getUserInfo, 
  getAuthenticatedUsername 
} from './user-service';

// Re-export types
export type { 
  SimklUserInfo, 
  SimklTokenResponse,
  SimklAuthState
} from './types';