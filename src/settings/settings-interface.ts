import type { MALUserInfo } from '../api/mal';
// import type { SimklUserInfo } from '../api/simkl';
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
  
 /*// SIMKL Authentication
  simklClientId: string;
  simklClientSecret?: string;
  simklAccessToken?: string;
  simklUserInfo?: SimklUserInfo | null;
  simklAuthenticated: boolean;
  */
  // Storage Settings
  animeFolder: string;
  mangaFolder: string;
  
  // Property Customization
  propertyMapping: PropertyMapping;
  useCustomPropertyMapping: boolean;
  
  // Sync Settings
  forceFullSync: boolean; 
  syncOnLoad: boolean; // Sync after plugin loads
  backgroundSync: boolean; // Periodic background sync
  backgroundSyncInterval: number; // Interval in minutes (min: 30)
  
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
  
 /*
 // SIMKL defaults
  simklClientId: '',
  simklClientSecret: '',
  simklAccessToken: '',
  simklUserInfo: null,
  simklAuthenticated: false,
  */
  // Storage defaults
  animeFolder: 'Cassette/Anime',
  mangaFolder: 'Cassette/Manga',
  
  // Property customization defaults
  propertyMapping: DEFAULT_PROPERTY_MAPPING,
  useCustomPropertyMapping: false,
  
  // Sync defaults
  forceFullSync: false,
  syncOnLoad: false,
  backgroundSync: false,
  backgroundSyncInterval: 120, // 120 minutes default
  
  // Template defaults
  useCustomTemplate: false,
  customTemplatePath: undefined,
  
  // Debug defaults
  debugMode: false,
};