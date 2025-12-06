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

/**
 * Property Mapping - INTERNAL USE ONLY
 * 
 * This module is used internally to map template variable keys to their default
 * property names. Users configure properties via the Template system in settings.
 * 
 * The PropertyMapping interface and DEFAULT_PROPERTY_MAPPING serve as reference
 * for what properties are available and their conventional names.
 */

export interface PropertyMapping {
  // Sync identifier (CRITICAL: Primary key for file lookup)
  cassetteSync?: string;
  
  updatedAt?: string; // Last sync timestamp - fixed internal property
  
  // Basic fields (common to both anime and manga)
  id?: string;
  title?: string;
  category?: string;
  platform?: string;
  url?: string; // Platform link (e.g., MyAnimeList page URL)
  
  // Visual (common)
  mainPicture?: string;
  
  // Alternative titles (Obsidian's aliases property - common)
  aliases?: string;
  
  // Description (common)
  synopsis?: string;
  
  // Metadata (common)
  mediaType?: string;
  status?: string;
  mean?: string;
  
  // Genres (common)
  genres?: string;
  
  
    // Publication/Airing dates (UNIFIED - common to both anime and manga)
  releasedStart?: string;  // Maps to 'released'
  releasedEnd?: string;    // Maps to 'ended'
  // Source material (common to both anime and manga)
  source?: string;
  
  // Anime-specific
  numEpisodes?: string;
  studios?: string;
  duration?: string;  
  userStartDate?: string;
  userFinishDate?: string;

  
  // Manga-specific
  numVolumes?: string;
  numChapters?: string;
  authors?: string;
  userStatus?: string;
  userScore?: string;
  numEpisodesWatched?: string;
  numVolumesRead?: string;
  numChaptersRead?: string;
  
}

/**
 * Default property mappings
 */
export const DEFAULT_PROPERTY_MAPPING: PropertyMapping = {
  // Sync identifier (PRIMARY KEY - never change this)
  cassetteSync: 'cassette',
  
  updatedAt: 'synced', // Fixed internal sync timestamp
  
  // Basic fields (common)
  id: 'id',
  title: 'title',
  category: 'category',
  platform: 'platform',
  url: 'source',
  
  // Visual (common)
  mainPicture: 'image',
  
  // Alternative titles - uses Obsidian's built-in aliases (common)
  aliases: 'aliases',
  
  // Description (common)
  synopsis: 'description',
  
  // Metadata (common)
  mediaType: 'media',
  status: 'state',
  mean: 'score',
  
  // Genres (common)
  genres: 'genres',
  
  
  // Publication/Airing dates (UNIFIED - common)
  releasedStart: 'released',
  releasedEnd: 'ended',
  
  // Origin material (common - both anime and manga)
  source: 'origin',
  
  // Anime-specific
  numEpisodes: 'episodes',
  studios: 'studios',   
  duration: 'duration',

  // Manga-specific
  numVolumes: 'volumes',
  numChapters: 'chapters',
  authors: 'authors',

  
  // User list data (common)
  userStatus: 'status',
  userScore: 'rating',
  numEpisodesWatched: 'eps_seen',
  numVolumesRead: 'vol_read',
  numChaptersRead: 'chap_read',
  userStartDate: 'started',   
  userFinishDate: 'finished',
};
