// Main settings interface for Cassette plugin

import type { MALUserInfo } from '../auth/mal';

export interface CassetteSettings {
  // MAL Authentication
  malClientId: string;
  malClientSecret?: string;
  malAccessToken?: string;
  malRefreshToken?: string;
  malTokenExpiry?: number | null;
  malUserInfo?: MALUserInfo | null;
  malAuthenticated: boolean;
  
  // Add other platform settings here as needed
  // anilistToken?: string;
  // simklToken?: string;
  // etc...
}

export const DEFAULT_SETTINGS: CassetteSettings = {
  malClientId: '',
  malClientSecret: '',
  malAccessToken: '',
  malRefreshToken: '',
  malTokenExpiry: null,
  malUserInfo: null,
  malAuthenticated: false,
};
