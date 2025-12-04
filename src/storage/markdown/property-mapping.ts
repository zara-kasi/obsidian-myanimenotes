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