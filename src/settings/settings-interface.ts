import type { MALUserInfo } from '../api/mal';
import type { TemplateConfig } from './template-config';

export interface CassetteSettings {
  // MAL Authentication
  malClientId: string;
  malClientSecret?: string;
  malAccessToken?: string;
  malRefreshToken?: string;
  malTokenExpiry?: number | null;
  malUserInfo?: MALUserInfo | null;
  malAuthenticated: boolean;
  
  // OAuth flow state (temporary, cleared after auth completes)
  malAuthState?: {
    verifier: string;
    state: string;
    timestamp: number;
  } | null;
  
  // Advanced API settings
  apiMaxRetries?: number;
  apiRetryDelay?: number;
  
  // Template System (Primary Configuration)
  animeTemplate?: TemplateConfig;
  mangaTemplate?: TemplateConfig;
  
  // Sync Settings
  forceFullSync: boolean; 
  syncOnLoad: boolean;
  scheduledSync: boolean;
  scheduledSyncInterval: number; // Interval in minutes (min: 60)
  lastSuccessfulSync?: number;
  optimizeAutoSync: boolean;
  
  // Template Settings (for future use)
  useCustomTemplate: boolean;
  customTemplatePath?: string;
  
  // Notification Settings
  notificationsEnabled: boolean;
  
  // Debug Settings
  debugMode: boolean;
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
  malAuthState: null, 
  
  // Template system
  animeTemplate: undefined,
  mangaTemplate: undefined,
  
  // Sync defaults
  forceFullSync: false,
  syncOnLoad: true,
  scheduledSync: false,
  scheduledSyncInterval: 60,
  lastSuccessfulSync: undefined,
  optimizeAutoSync: true,
  
  // Template defaults
  useCustomTemplate: false,
  customTemplatePath: undefined,
  
  // Notification defaults
  notificationsEnabled: true,
  
  // Debug defaults
  debugMode: false,
};
