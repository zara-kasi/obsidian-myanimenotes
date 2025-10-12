// src/sync/types.ts
// Universal data types for media synchronization

/**
 * Universal media status (normalized across platforms)
 */
export enum MediaStatus {
  // Anime/Manga production status
  FINISHED = 'finished',
  CURRENTLY_RELEASING = 'currently_releasing',
  NOT_YET_RELEASED = 'not_yet_released',
}

/**
 * Universal user list status (normalized across platforms)
 */
export enum UserListStatus {
  // For Anime
  WATCHING = 'watching',
  PLAN_TO_WATCH = 'plan_to_watch',
  
  // For Manga
  READING = 'reading',
  PLAN_TO_READ = 'plan_to_read',
  
  // Common
  COMPLETED = 'completed',
  ON_HOLD = 'on_hold',
  DROPPED = 'dropped',
}

/**
 * Media type (anime or manga)
 */
export enum MediaCategory {
  ANIME = 'anime',
  MANGA = 'manga',
}

/**
 * Universal picture structure
 */
export interface UniversalPicture {
  medium?: string;
  large?: string;
}

/**
 * Universal alternative titles
 */
export interface UniversalAlternativeTitles {
  en?: string;
  ja?: string;
  synonyms?: string[];
}

/**
 * Universal genre
 */
export interface UniversalGenre {
  id: number;
  name: string;
}

/**
 * Universal author (for manga)
 */
export interface UniversalAuthor {
  firstName: string;
  lastName: string;
  role?: string;
}

/**
 * Universal start season (for anime)
 */
export interface UniversalSeason {
  year: number;
  season: string; // winter, spring, summer, fall
}

/**
 * Universal media item (normalized structure)
 */
export interface UniversalMediaItem {
  // Basic info
  id: number;
  title: string;
  category: MediaCategory;
  url?: string; // Platform link (e.g., https://myanimelist.net/anime/123)
  
  // Visual
  mainPicture?: UniversalPicture;
  pictures?: UniversalPicture[];
  
  // Alternative titles
  alternativeTitles?: UniversalAlternativeTitles;
  
  // Description
  synopsis?: string;
  
  // Metadata
  mediaType: string; // TV, Movie, manga, novel, etc.
  status: MediaStatus;
  mean?: number; // Average score
  
  // Genres
  genres?: UniversalGenre[];
    // Publication/Airing dates (UNIFIED - common to both anime and manga)
  releasedStart?: string;  // When media started (YYYY-MM-DD)
  releasedEnd?: string;    // When media ended (YYYY-MM-DD)
  
  // Anime-specific
  numEpisodes?: number;
  startSeason?: UniversalSeason;
  source?: string; // manga, light_novel, etc.
  studios?: string[];          // production studios
  duration?: number;
  
  // Manga-specific
  numVolumes?: number;
  numChapters?: number;
  authors?: UniversalAuthor[];
  serializations?: string[];
  
  // User list data
  userStatus?: UserListStatus;
  userScore?: number; // 0-10
  userStartDate?: string;      // when user started watching (YYYY-MM-DD)
  userFinishDate?: string;     //  when user finished watching (YYYY-MM-DD)
  numEpisodesWatched?: number; // For anime
  numVolumesRead?: number; // For manga
  numChaptersRead?: number; // For manga
  
  // Platform metadata
  platform: 'mal' | 'simkl';
  lastSynced?: number; // timestamp
}

/**
 * Sync result for a single item
 */
export interface SyncItemResult {
  id: number;
  title: string;
  success: boolean;
  error?: string;
  action?: 'created' | 'updated' | 'skipped';
}

/**
 * Overall sync result
 */
export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  results: SyncItemResult[];
  errors: string[];
  startTime: number;
  endTime: number;
}