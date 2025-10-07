import type { MALUserInfo } from '../auth/mal';
import type { SimklUserInfo } from '../auth/simkl';
import type { PropertyMapping } from '../sync/storage/property-mapping';
import { DEFAULT_PROPERTY_MAPPING } from '../sync/storage/property-mapping';

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
  
  // Storage Settings
  animeFolder: string;
  mangaFolder: string;
  
  // Property Customization
  propertyMapping: PropertyMapping;
  useCustomPropertyMapping: boolean;
  
  // Sync Settings
  autoSync: boolean;
  syncInterval: number; // minutes
  lastSyncTime?: number;
  
  // Template Settings (for future use)
  useCustomTemplate: boolean;
  customTemplatePath?: string;
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
  
  // Storage defaults
  animeFolder: 'Cassette/Anime',
  mangaFolder: 'Cassette/Manga',
  
  // Property customization defaults
  propertyMapping: DEFAULT_PROPERTY_MAPPING,
  useCustomPropertyMapping: false,
  
  // Sync defaults
  autoSync: false,
  syncInterval: 60, // 1 hour
  lastSyncTime: undefined,
  
  // Template defaults
  useCustomTemplate: false,
  customTemplatePath: undefined,
};