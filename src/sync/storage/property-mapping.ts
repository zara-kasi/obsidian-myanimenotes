export interface PropertyMapping {
  // Basic fields
  id?: string;
  title?: string;
  category?: string;
  platform?: string;
  
  // Visual
  mainPicture?: string;
  pictures?: string;
  
  // Alternative titles (Obsidian's aliases property)
  aliases?: string;
  
  // Description
  synopsis?: string;
  
  // Metadata
  mediaType?: string;
  status?: string;
  mean?: string;
  
  // Genres
  genres?: string;
  
  // Anime-specific
  numEpisodes?: string;
  startSeasonYear?: string;
  startSeasonName?: string;
  source?: string;
  
  // Manga-specific
  numVolumes?: string;
  numChapters?: string;
  authors?: string;
  
  // User list data
  userStatus?: string;
  userScore?: string;
  numEpisodesWatched?: string;
  numVolumesRead?: string;
  numChaptersRead?: string;
  
  // Sync metadata
  lastSynced?: string;
}

/**
 * Default property mappings based on MAL specification
 * Matches the template from the mapping document
 */
export const DEFAULT_PROPERTY_MAPPING: PropertyMapping = {
  // Basic fields
  id: 'id',
  title: 'title',
  category: 'category',
  platform: 'platform',
  
  // Visual
  mainPicture: 'cover',
  pictures: 'banner',
  
  // Alternative titles - uses Obsidian's built-in aliases
  aliases: 'aliases',
  
  // Description
  synopsis: 'synopsis',
  
  // Metadata
  mediaType: 'type',
  status: 'status',
  mean: 'score',
  
  // Genres
  genres: 'genres',
  
  // Anime-specific (matching document 1)
  numEpisodes: 'total_episodes',
  startSeasonYear: 'season_year',
  startSeasonName: 'season_name',
  source: 'source',
  
  // Manga-specific (matching document 1)
  numVolumes: 'total_volumes',
  numChapters: 'total_chapters',
  authors: 'authors',
  
  // User list data (matching document 1)
  userStatus: 'list',
  userScore: 'rating',
  numEpisodesWatched: 'episodes',
  numVolumesRead: 'volumes_read',
  numChaptersRead: 'chapters_read',
  
  // Sync metadata
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