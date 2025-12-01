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
  category: 'anime' | 'manga' | 'common';  // Which template it belongs to
}

/**
 * All available properties with their metadata
 */
export const PROPERTY_METADATA: PropertyMetadata[] = [
  // Common properties
  { key: 'title', label: 'Title', defaultName: 'title', category: 'common' },
  { key: 'id', label: 'ID', defaultName: 'id', category: 'common' },
  { key: 'category', label: 'Category', defaultName: 'category', category: 'common' },
  { key: 'platform', label: 'Platform', defaultName: 'platform', category: 'common' },
  { key: 'url', label: 'Source URL', defaultName: 'source', category: 'common' },
  { key: 'mainPicture', label: 'Cover Image', defaultName: 'image', category: 'common' },
  { key: 'synopsis', label: 'Synopsis', defaultName: 'description', category: 'common' },
  { key: 'mediaType', label: 'Media Type', defaultName: 'media', category: 'common' },
  { key: 'status', label: 'Status', defaultName: 'state', category: 'common' },
  { key: 'mean', label: 'Average Score', defaultName: 'score', category: 'common' },
  { key: 'genres', label: 'Genres', defaultName: 'genres', category: 'common' },
  { key: 'releasedStart', label: 'Released Start', defaultName: 'released', category: 'common' },
  { key: 'releasedEnd', label: 'Released End', defaultName: 'ended', category: 'common' },
  { key: 'source', label: 'Source Material', defaultName: 'origin', category: 'common' },
  
  // Anime-specific
  { key: 'numEpisodes', label: 'Episodes', defaultName: 'episodes', category: 'anime' },
  { key: 'numEpisodesWatched', label: 'Episodes Watched', defaultName: 'eps_seen', category: 'anime' },
  { key: 'studios', label: 'Studios', defaultName: 'studios', category: 'anime' },
  { key: 'duration', label: 'Duration', defaultName: 'duration', category: 'anime' },
  
  // Manga-specific
  { key: 'numVolumes', label: 'Volumes', defaultName: 'volumes', category: 'manga' },
  { key: 'numVolumesRead', label: 'Volumes Read', defaultName: 'vol_read', category: 'manga' },
  { key: 'numChapters', label: 'Chapters', defaultName: 'chapters', category: 'manga' },
  { key: 'numChaptersRead', label: 'Chapters Read', defaultName: 'chap_read', category: 'manga' },
  { key: 'authors', label: 'Authors', defaultName: 'authors', category: 'manga' },
  
  // User data (common)
  { key: 'userStatus', label: 'User Status', defaultName: 'status', category: 'common' },
  { key: 'userScore', label: 'User Rating', defaultName: 'rating', category: 'common' },
  { key: 'userStartDate', label: 'Started Date', defaultName: 'started', category: 'common' },
  { key: 'userFinishDate', label: 'Finished Date', defaultName: 'finished', category: 'common' },
];

/**
 * Gets property metadata by key
 */
export function getPropertyMetadata(key: string): PropertyMetadata | undefined {
  return PROPERTY_METADATA.find(p => p.key === key);
}

/**
 * Gets available properties for a category
 */
export function getAvailableProperties(category: 'anime' | 'manga'): PropertyMetadata[] {
  return PROPERTY_METADATA.filter(p => 
    p.category === 'common' || p.category === category
  );
}

/**
 * Default anime template
 */
export const DEFAULT_ANIME_TEMPLATE: TemplateConfig = {
  folderPath: 'Cassette/Anime',
  properties: [
    { id: 'prop-1', key: 'title', customName: 'title', order: 1 },
    { id: 'prop-2', key: 'id', customName: 'id', order: 2 },
    { id: 'prop-3', key: 'category', customName: 'category', order: 3 },
    { id: 'prop-4', key: 'platform', customName: 'platform', order: 4 },
    { id: 'prop-5', key: 'url', customName: 'source', order: 5 },
    { id: 'prop-6', key: 'mainPicture', customName: 'image', order: 6 },
    { id: 'prop-7', key: 'synopsis', customName: 'description', order: 7 },
    { id: 'prop-8', key: 'mediaType', customName: 'media', order: 8 },
    { id: 'prop-9', key: 'status', customName: 'state', order: 9 },
    { id: 'prop-10', key: 'mean', customName: 'score', order: 10 },
    { id: 'prop-11', key: 'genres', customName: 'genres', order: 11 },
    { id: 'prop-12', key: 'source', customName: 'origin', order: 12 },
    { id: 'prop-13', key: 'releasedStart', customName: 'released', order: 13 },
    { id: 'prop-14', key: 'releasedEnd', customName: 'ended', order: 14 },
    { id: 'prop-15', key: 'numEpisodes', customName: 'episodes', order: 15 },
    { id: 'prop-16', key: 'numEpisodesWatched', customName: 'eps_seen', order: 16 },
    { id: 'prop-17', key: 'studios', customName: 'studios', order: 17 },
    { id: 'prop-18', key: 'duration', customName: 'duration', order: 18 },
    { id: 'prop-19', key: 'userStatus', customName: 'status', order: 19 },
    { id: 'prop-20', key: 'userScore', customName: 'rating', order: 20 },
    { id: 'prop-21', key: 'userStartDate', customName: 'started', order: 21 },
    { id: 'prop-22', key: 'userFinishDate', customName: 'finished', order: 22 },
  ]
};

/**
 * Default manga template
 */
export const DEFAULT_MANGA_TEMPLATE: TemplateConfig = {
  folderPath: 'Cassette/Manga',
  properties: [
    { id: 'prop-1', key: 'title', customName: 'title', order: 1 },
    { id: 'prop-2', key: 'id', customName: 'id', order: 2 },
    { id: 'prop-3', key: 'category', customName: 'category', order: 3 },
    { id: 'prop-4', key: 'platform', customName: 'platform', order: 4 },
    { id: 'prop-5', key: 'url', customName: 'source', order: 5 },
    { id: 'prop-6', key: 'mainPicture', customName: 'image', order: 6 },
    { id: 'prop-7', key: 'synopsis', customName: 'description', order: 7 },
    { id: 'prop-8', key: 'mediaType', customName: 'media', order: 8 },
    { id: 'prop-9', key: 'status', customName: 'state', order: 9 },
    { id: 'prop-10', key: 'mean', customName: 'score', order: 10 },
    { id: 'prop-11', key: 'genres', customName: 'genres', order: 11 },
    { id: 'prop-12', key: 'source', customName: 'origin', order: 12 },
    { id: 'prop-13', key: 'releasedStart', customName: 'released', order: 13 },
    { id: 'prop-14', key: 'releasedEnd', customName: 'ended', order: 14 },
    { id: 'prop-15', key: 'numVolumes', customName: 'volumes', order: 15 },
    { id: 'prop-16', key: 'numVolumesRead', customName: 'vol_read', order: 16 },
    { id: 'prop-17', key: 'numChapters', customName: 'chapters', order: 17 },
    { id: 'prop-18', key: 'numChaptersRead', customName: 'chap_read', order: 18 },
    { id: 'prop-19', key: 'authors', customName: 'authors', order: 19 },
    { id: 'prop-20', key: 'userStatus', customName: 'status', order: 20 },
    { id: 'prop-21', key: 'userScore', customName: 'rating', order: 21 },
    { id: 'prop-22', key: 'userStartDate', customName: 'started', order: 22 },
    { id: 'prop-23', key: 'userFinishDate', customName: 'finished', order: 23 },
  ]
};

/**
 * Generates a unique property ID
 */
export function generatePropertyId(): string {
  return `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}