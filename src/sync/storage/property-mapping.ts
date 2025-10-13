/**
 * Property Mapping with cassette as controlled property
 * CHANGE: Added 'url' property for platform links
 */

export interface PropertyMapping {
  // Sync identifier (CRITICAL: Primary key for file lookup)
  cassetteSync?: string;
  
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
  
  // Sync metadata (common)
  lastSynced?: string;
}

/**
 * Default property mappings
 */
export const DEFAULT_PROPERTY_MAPPING: PropertyMapping = {
  // Sync identifier (PRIMARY KEY - never change this)
  cassetteSync: 'cassette',
  
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
  mediaType: 'type',
  status: 'status',
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
  userStatus: 'list',
  userScore: 'rating',
  numEpisodesWatched: 'eps_seen',
  numVolumesRead: 'vol_read',
  numChaptersRead: 'chap_read',
  userStartDate: 'started',   
  userFinishDate: 'finished',
  
  // Sync metadata (common)
  lastSynced: 'synced',
};

/**
 * Gets the mapped property name
 */
export function getMappedPropertyName(
  key: keyof PropertyMapping,
  mapping: PropertyMapping
): string {
  return mapping[key] || DEFAULT_PROPERTY_MAPPING[key] || key;
}