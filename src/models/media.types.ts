// Universal data types for media synchronization

/**
 * Universal media status (normalized across platforms)
 */
export enum MediaStatus {
  // Anime/Manga production status
  FINISHED = 'Finished',
  CURRENTLY_RELEASING = 'Ongoing',
  NOT_YET_RELEASED = 'Upcoming',
}

/**
 * Universal user list status (normalized across platforms)
 */
export enum UserListStatus {
  // For Anime
  WATCHING = 'Watching',
  PLAN_TO_WATCH = 'Planning',
  
  // For Manga
  READING = 'Reading',
  PLAN_TO_READ = 'Planning',
  
  // Common
  COMPLETED = 'Completed',
  ON_HOLD = 'On-hold',
  DROPPED = 'Dropped',
}

/**
 * Media type (anime or manga)
 */
export enum MediaCategory {
  ANIME = 'Anime',
  MANGA = 'Manga',
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
  source?: string; // manga, light_novel, etc.
  studios?: string[];          // production studios
  duration?: number;
  
  // Manga-specific
  numVolumes?: number;
  numChapters?: number;
  authors?: UniversalAuthor[];
  
  
  // User list data
  userStatus?: UserListStatus;
  userScore?: number; // 0-10
  userStartDate?: string;      // when user started watching (YYYY-MM-DD)
  userFinishDate?: string;     //  when user finished watching (YYYY-MM-DD)
  numEpisodesWatched?: number; // For anime
  numVolumesRead?: number; // For manga
  numChaptersRead?: number; // For manga
  
  // Sync metadata - timestamp from API
  syncedAt?: string; 
  
  // Platform metadata
  platform: 'MAL';
}
