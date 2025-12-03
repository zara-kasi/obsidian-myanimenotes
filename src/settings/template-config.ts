/**
 * Template Configuration
 * 
 * Defines template structure and default configurations for anime and manga
 */

/**
 * Single property in a template
 */
export interface PropertyItem {
  id: string;              // Unique ID for drag-drop (e.g., 'prop-1', 'prop-2')
  key: string;            // Template variable (e.g., 'title', 'numEpisodes')
  customName: string;     // User's custom property name (e.g., 'episodes')
  order: number;          // Sort order for display
}

/**
 * Template configuration for anime or manga
 */
export interface TemplateConfig {
  folderPath: string;
  properties: PropertyItem[];
}

/**
 * Property metadata for available properties
 */
export interface PropertyMetadata {
  key: string;              // Template variable (e.g., 'title')
  label: string;            // Display name in dropdown (e.g., 'Title')
  defaultName: string;      // Default property name (e.g., 'title')
}

/**
 * Common properties (shared by both anime and manga)
 */
const COMMON_PROPERTIES: PropertyMetadata[] = [
  { key: 'title', label: 'Title', defaultName: 'title' },
  { key: 'alternativeTitles', label: 'Alternative Titles', defaultName: 'aliases' },
  { key: 'id', label: 'ID', defaultName: 'id' },
  { key: 'category', label: 'Category', defaultName: 'category' },
  { key: 'platform', label: 'Platform', defaultName: 'platform' },
  { key: 'url', label: 'Source URL', defaultName: 'source' },
  { key: 'mainPicture', label: 'Cover Image', defaultName: 'image' },
  { key: 'synopsis', label: 'Synopsis', defaultName: 'description' },
  { key: 'mediaType', label: 'Media Type', defaultName: 'media' },
  { key: 'status', label: 'Status', defaultName: 'state' },
  { key: 'mean', label: 'Average Score', defaultName: 'score' },
  { key: 'genres', label: 'Genres', defaultName: 'genres' },
  { key: 'releasedStart', label: 'Released Start', defaultName: 'released' },
  { key: 'releasedEnd', label: 'Released End', defaultName: 'ended' },
  { key: 'source', label: 'Source Material', defaultName: 'origin' },
  { key: 'userStatus', label: 'User Status', defaultName: 'status' },
  { key: 'userScore', label: 'User Rating', defaultName: 'rating' },
  { key: 'userStartDate', label: 'Started Date', defaultName: 'started' },
  { key: 'userFinishDate', label: 'Finished Date', defaultName: 'finished' },
];

/**
 * Anime-specific properties (including common)
 */
export const ANIME_PROPERTIES: PropertyMetadata[] = [
  ...COMMON_PROPERTIES,
  { key: 'numEpisodes', label: 'Episodes', defaultName: 'episodes' },
  { key: 'numEpisodesWatched', label: 'Episodes Watched', defaultName: 'eps_seen' },
  { key: 'studios', label: 'Studios', defaultName: 'studios' },
  { key: 'duration', label: 'Duration', defaultName: 'duration' },
];

/**
 * Manga-specific properties (including common)
 */
export const MANGA_PROPERTIES: PropertyMetadata[] = [
  ...COMMON_PROPERTIES,
  { key: 'numVolumes', label: 'Volumes', defaultName: 'volumes' },
  { key: 'numVolumesRead', label: 'Volumes Read', defaultName: 'vol_read' },
  { key: 'numChapters', label: 'Chapters', defaultName: 'chapters' },
  { key: 'numChaptersRead', label: 'Chapters Read', defaultName: 'chap_read' },
  { key: 'authors', label: 'Authors', defaultName: 'authors' },
];

/**
 * Gets property metadata by key
 */
export function getPropertyMetadata(key: string, category: 'anime' | 'manga'): PropertyMetadata | undefined {
  const properties = category === 'anime' ? ANIME_PROPERTIES : MANGA_PROPERTIES;
  return properties.find(p => p.key === key);
}

/**
 * Gets available properties for a category
 */
export function getAvailableProperties(category: 'anime' | 'manga'): PropertyMetadata[] {
  return category === 'anime' ? ANIME_PROPERTIES : MANGA_PROPERTIES;
}

/**
 * Default anime template
 * NOTE: 'cassetteSync' and 'syncedAt' are permanent properties that cannot be removed
 * Contains only common + anime-specific properties
 */
export const DEFAULT_ANIME_TEMPLATE: TemplateConfig = {
  folderPath: 'Cassette/Anime',
  properties: [
    // Permanent properties (use internal field names, not API field names)
    { id: 'prop-permanent-1', key: 'cassetteSync', customName: 'cassette', order: 1 },
    { id: 'prop-permanent-2', key: 'syncedAt', customName: 'synced', order: 2 },
    
    // Common properties
    { id: 'prop-1', key: 'title', customName: 'title', order: 3 },
    { id: 'prop-2', key: 'alternativeTitles', customName: 'aliases', order: 4 },
    { id: 'prop-3', key: 'id', customName: 'id', order: 5 },
    { id: 'prop-4', key: 'category', customName: 'category', order: 6 },
    { id: 'prop-5', key: 'platform', customName: 'platform', order: 7 },
    { id: 'prop-6', key: 'url', customName: 'source', order: 8 },
    { id: 'prop-7', key: 'mainPicture', customName: 'image', order: 9 },
    { id: 'prop-8', key: 'synopsis', customName: 'description', order: 10 },
    { id: 'prop-9', key: 'mediaType', customName: 'media', order: 11 },
    { id: 'prop-10', key: 'status', customName: 'state', order: 12 },
    { id: 'prop-11', key: 'mean', customName: 'score', order: 13 },
    { id: 'prop-12', key: 'genres', customName: 'genres', order: 14 },
    { id: 'prop-13', key: 'source', customName: 'origin', order: 15 },
    { id: 'prop-14', key: 'releasedStart', customName: 'released', order: 16 },
    { id: 'prop-15', key: 'releasedEnd', customName: 'ended', order: 17 },
    
    // Anime-specific properties
    { id: 'prop-16', key: 'numEpisodes', customName: 'episodes', order: 18 },
    { id: 'prop-17', key: 'numEpisodesWatched', customName: 'eps_seen', order: 19 },
    { id: 'prop-18', key: 'studios', customName: 'studios', order: 20 },
    { id: 'prop-19', key: 'duration', customName: 'duration', order: 21 },
    
    // User data (common)
    { id: 'prop-20', key: 'userStatus', customName: 'status', order: 22 },
    { id: 'prop-21', key: 'userScore', customName: 'rating', order: 23 },
    { id: 'prop-22', key: 'userStartDate', customName: 'started', order: 24 },
    { id: 'prop-23', key: 'userFinishDate', customName: 'finished', order: 25 },
  ]
};

/**
 * Default manga template
 * NOTE: 'cassetteSync' and 'syncedAt' are permanent properties that cannot be removed
 * Contains only common + manga-specific properties
 */
export const DEFAULT_MANGA_TEMPLATE: TemplateConfig = {
  folderPath: 'Cassette/Manga',
  properties: [
    // Permanent properties (use internal field names, not API field names)
    { id: 'prop-permanent-1', key: 'cassetteSync', customName: 'cassette', order: 1 },
    { id: 'prop-permanent-2', key: 'syncedAt', customName: 'synced', order: 2 },
    
    // Common properties
    { id: 'prop-1', key: 'title', customName: 'title', order: 3 },
    { id: 'prop-2', key: 'alternativeTitles', customName: 'aliases', order: 4 },
    { id: 'prop-3', key: 'id', customName: 'id', order: 5 },
    { id: 'prop-4', key: 'category', customName: 'category', order: 6 },
    { id: 'prop-5', key: 'platform', customName: 'platform', order: 7 },
    { id: 'prop-6', key: 'url', customName: 'source', order: 8 },
    { id: 'prop-7', key: 'mainPicture', customName: 'image', order: 9 },
    { id: 'prop-8', key: 'synopsis', customName: 'description', order: 10 },
    { id: 'prop-9', key: 'mediaType', customName: 'media', order: 11 },
    { id: 'prop-10', key: 'status', customName: 'state', order: 12 },
    { id: 'prop-11', key: 'mean', customName: 'score', order: 13 },
    { id: 'prop-12', key: 'genres', customName: 'genres', order: 14 },
    { id: 'prop-13', key: 'source', customName: 'origin', order: 15 },
    { id: 'prop-14', key: 'releasedStart', customName: 'released', order: 16 },
    { id: 'prop-15', key: 'releasedEnd', customName: 'ended', order: 17 },
    
    // Manga-specific properties
    { id: 'prop-16', key: 'numVolumes', customName: 'volumes', order: 18 },
    { id: 'prop-17', key: 'numVolumesRead', customName: 'vol_read', order: 19 },
    { id: 'prop-18', key: 'numChapters', customName: 'chapters', order: 20 },
    { id: 'prop-19', key: 'numChaptersRead', customName: 'chap_read', order: 21 },
    { id: 'prop-20', key: 'authors', customName: 'authors', order: 22 },
    
    // User data (common)
    { id: 'prop-21', key: 'userStatus', customName: 'status', order: 23 },
    { id: 'prop-22', key: 'userScore', customName: 'rating', order: 24 },
    { id: 'prop-23', key: 'userStartDate', customName: 'started', order: 25 },
    { id: 'prop-24', key: 'userFinishDate', customName: 'finished', order: 26 },
  ]
};

/**
 * Generates a unique property ID
 */
export function generatePropertyId(): string {
  return `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}