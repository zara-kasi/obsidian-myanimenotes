// src/sync/storage/property-mapping.ts
// Property mapping configuration for customizable frontmatter

export interface PropertyMapping {
  // Basic fields
  id?: string;
  title?: string;
  category?: string;
  platform?: string;
  
  // Visual
  mainPicture?: string;
  pictures?: string;
  
  // Alternative titles
  alternativeTitlesEn?: string;
  alternativeTitlesJa?: string;
  alternativeTitlesSynonyms?: string;
  
  // Description
  synopsis?: string;
  
  // Metadata
  mediaType?: string;
  status?: string;
  mean?: string;
  rank?: string;
  popularity?: string;
  
  // Genres
  genres?: string;
  
  // Anime-specific
  numEpisodes?: string;
  startSeason?: string;
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
 * Default property mappings
 */
export const DEFAULT_PROPERTY_MAPPING: PropertyMapping = {
  id: 'id',
  title: 'title',
  category: 'category',
  platform: 'platform',
  mainPicture: 'cover',
  pictures: 'images',
  alternativeTitlesEn: 'title_english',
  alternativeTitlesJa: 'title_japanese',
  alternativeTitlesSynonyms: 'title_synonyms',
  synopsis: 'synopsis',
  mediaType: 'type',
  status: 'status',
  mean: 'score',
  rank: 'rank',
  popularity: 'popularity',
  genres: 'genres',
  numEpisodes: 'episodes',
  startSeason: 'season',
  startSeasonYear: 'season_year',
  startSeasonName: 'season_name',
  source: 'source',
  numVolumes: 'volumes',
  numChapters: 'chapters',
  authors: 'authors',
  userStatus: 'my_status',
  userScore: 'my_score',
  numEpisodesWatched: 'episodes_watched',
  numVolumesRead: 'volumes_read',
  numChaptersRead: 'chapters_read',
  lastSynced: 'last_synced',
};

/**
 * Property template defining the order and structure
 */
export interface PropertyTemplate {
  anime: string[];
  manga: string[];
}

/**
 * Default property order templates
 */
export const DEFAULT_PROPERTY_TEMPLATE: PropertyTemplate = {
  anime: [
    'id',
    'title',
    'alternativeTitlesEn',
    'alternativeTitlesJa',
    'alternativeTitlesSynonyms',
    'category',
    'platform',
    'mediaType',
    'status',
    'userStatus',
    'userScore',
    'mean',
    'rank',
    'popularity',
    'numEpisodes',
    'numEpisodesWatched',
    'startSeasonYear',
    'startSeasonName',
    'source',
    'genres',
    'mainPicture',
    'pictures',
    'synopsis',
    'lastSynced',
  ],
  manga: [
    'id',
    'title',
    'alternativeTitlesEn',
    'alternativeTitlesJa',
    'alternativeTitlesSynonyms',
    'category',
    'platform',
    'mediaType',
    'status',
    'userStatus',
    'userScore',
    'mean',
    'rank',
    'popularity',
    'numVolumes',
    'numVolumesRead',
    'numChapters',
    'numChaptersRead',
    'authors',
    'genres',
    'mainPicture',
    'pictures',
    'synopsis',
    'lastSynced',
  ],
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

/**
 * Gets the template for a category
 */
export function getPropertyTemplate(
  category: 'anime' | 'manga',
  template: PropertyTemplate
): string[] {
  return template[category] || DEFAULT_PROPERTY_TEMPLATE[category];
}