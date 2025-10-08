/**
 * Property Mapping with cassette_sync as controlled property
 * 
 * CHANGE: Added cassette_sync as a recognized controlled property
 * This ensures it's not accidentally removed during frontmatter operations
 */

export interface PropertyMapping {
  // Sync identifier (CRITICAL: Primary key for file lookup)
  cassetteSync?: string;
  
  // Basic fields (common to both anime and manga)
  id?: string;
  title?: string;
  category?: string;
  platform?: string;
  
  // Visual (common)
  mainPicture?: string;
  pictures?: string;
  
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
  
  // Season info (common to both anime and manga)
  seasonYear?: string;
  seasonName?: string;
  
  // Source material (common to both anime and manga)
  source?: string;
  
  // Anime-specific
  numEpisodes?: string;
  startSeason?: string;
  
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
 * 
 * CHANGE: Added cassette_sync with default mapping to 'cassette_sync'
 * This is the canonical identifier field that must always be present
 */
export const DEFAULT_PROPERTY_MAPPING: PropertyMapping = {
  // Sync identifier (PRIMARY KEY - never change this)
  cassetteSync: 'cassette_sync',
  
  // Basic fields (common)
  id: 'id',
  title: 'title',
  category: 'category',
  platform: 'platform',
  
  // Visual (common)
  mainPicture: 'image',
  pictures: 'banner',
  
  // Alternative titles - uses Obsidian's built-in aliases (common)
  aliases: 'aliases',
  
  // Description (common)
  synopsis: 'synopsis',
  
  // Metadata (common)
  mediaType: 'type',
  status: 'status',
  mean: 'score',
  
  // Genres (common)
  genres: 'genres',
  
  // Season info (common - both anime and manga)
  seasonYear: 'season_year',
  seasonName: 'season_name',
  
  // Source material (common - both anime and manga)
  source: 'source',
  
  // Anime-specific
  numEpisodes: 'total_episodes',
  startSeason: 'start_season',
  
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