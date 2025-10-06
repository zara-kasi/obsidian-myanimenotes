// Main settings interface for Cassette plugin

import type { MALUserInfo } from '../auth/mal';
import type { SimklUserInfo } from '../auth/simkl';

export interface CassetteSettings {
  // MAL Authentication
  malClientId: string;
  malClientSecret?: string;
  malAccessToken?: string;
  malRefreshToken?: string;
  malTokenExpiry?: number | null;
  malUserInfo?: MALUserInfo | null;
  malAuthenticated: boolean;
  
  // SIMKL Authentication
  simklClientId: string;
  simklClientSecret?: string;
  simklAccessToken?: string;
  simklUserInfo?: SimklUserInfo | null;
  simklAuthenticated: boolean;
}

export const DEFAULT_SETTINGS: CassetteSettings = {
  // MAL defaults
  malClientId: '',
  malClientSecret: '',
  malAccessToken: '',
  malRefreshToken: '',
  malTokenExpiry: null,
  malUserInfo: null,
  malAuthenticated: false,
  
  // SIMKL defaults
  simklClientId: '',
  simklClientSecret: '',
  simklAccessToken: '',
  simklUserInfo: null,
  simklAuthenticated: false,
};