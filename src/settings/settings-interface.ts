import type { MALUserInfo } from '../api/mal';
import type { PropertyMapping } from '../storage/markdown';
import { DEFAULT_PROPERTY_MAPPING } from '../storage/markdown';

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
  
  // Property Customization
  propertyMapping: PropertyMapping;
  useCustomPropertyMapping: boolean;
  
  // Sync Settings
  forceFullSync: boolean; 
  syncOnLoad: boolean; // Sync shortly after plugin loads (3 seconds)
  scheduledSync: boolean; // Periodic scheduled sync
  scheduledSyncInterval: number; // Interval in minutes (min: 30)
  
  // Template Settings (for future use)
  useCustomTemplate: boolean;
  customTemplatePath?: string;
  
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
  
  // Property customization defaults
  propertyMapping: DEFAULT_PROPERTY_MAPPING,
  useCustomPropertyMapping: false,
  
  // Sync defaults
  forceFullSync: false,
  syncOnLoad: false,
  scheduledSync: false,
  scheduledSyncInterval: 60, // 60 minutes default
  
  // Template defaults
  useCustomTemplate: false,
  customTemplatePath: undefined,
  
  // Debug defaults
  debugMode: false,
};