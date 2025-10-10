/**
 * Property Mapping with cassette_sync as controlled property
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
  
  // Release info (common to both anime and manga)
  // For anime: start year from start_season
  // For manga: publication year
  released?: string;
  
  // Source material (common to both anime and manga)
  source?: string;
  
  // Anime-specific
  numEpisodes?: string;

  
  // Manga-specific
  numVolumes?: string;
  numChapters?: string;
  authors?: string;
  
  // User list data (common)
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
  cassetteSync: 'cassette_sync',
  
  // Basic fields (common)
  id: 'id',
  title: 'title',
  category: 'category',
  platform: 'platform',
  url: 'url',
  
  // Visual (common)
  mainPicture: 'main_picture',
  
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
  
  // Release info (common - replaces season_year and season_name)
  released: 'released',
  
  // Origin material (common - both anime and manga)
  source: 'origin',
  
  // Anime-specific
  numEpisodes: 'total_episodes',

  // Manga-specific
  numVolumes: 'total_volumes',
  numChapters: 'total_chapters',
  authors: 'authors',
  
  // User list data (common)
  userStatus: 'list',
  userScore: 'rating',
  numEpisodesWatched: 'episodes_watched',
  numVolumesRead: 'volumes_read',
  numChaptersRead: 'chapters_read',
  
  // Sync metadata (common)
  lastSynced: 'last_synced',
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