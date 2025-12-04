import type { MALUserInfo } from '../api/mal'
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
    timestamp: number; // For expiry checking
  } | null;
    // Advanced API settings
  apiMaxRetries?: number;
  apiRetryDelay?: number;
  
  // Storage Settings
  animeFolder: string;
  mangaFolder: string;
  
  // Template System
  animeTemplate?: TemplateConfig;
  mangaTemplate?: TemplateConfig;
  
  // Sync Settings
  forceFullSync: boolean; 
  syncOnLoad: boolean; // Sync shortly after plugin loads (3 seconds)
  scheduledSync: boolean; // Periodic scheduled sync
  scheduledSyncInterval: number; // Interval in minutes (min: 60)
  lastSuccessfulSync?: number; // Timestamp of last successful sync
  optimizeAutoSync: boolean; // Only sync active statuses during auto-sync
  
  // Template Settings (for future use)
  useCustomTemplate: boolean;
  customTemplatePath?: string;
  notificationsEnabled: boolean; // Enable/disable user notifications
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
  
  // Storage defaults
  animeFolder: 'Cassette/Anime',
  mangaFolder: 'Cassette/Manga',
  
  // Template system defaults
  animeTemplate: undefined,
  mangaTemplate: undefined,
  
  // Sync defaults
  forceFullSync: false,
  syncOnLoad: true,
  scheduledSync: false,
  scheduledSyncInterval: 60, // 60 minutes default
  lastSuccessfulSync: undefined, // No previous sync 
  optimizeAutoSync: true,
  // Template defaults
  useCustomTemplate: false,
  customTemplatePath: undefined,
  // Notification defaults
  notificationsEnabled: true,
  // Debug defaults
  debugMode: false,
};
