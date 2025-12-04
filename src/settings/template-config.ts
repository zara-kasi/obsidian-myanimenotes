/**
 * Template Configuration
 * 
 * Defines template structure and default configurations for anime and manga
 */

/**
 * Single property in a template
 */
export interface PropertyItem {
  id: string;                    // Unique ID for drag-drop
  propertyName: string;          // YAML property name (e.g., "episodes", "custom_desc")
  template: string;              // Template string with {{variables}} (e.g., "{{numEpisodes}} eps")
  order: number;                 // Sort order for display
}

/**
 * Available variables that can be used in templates
 * These map to UniversalMediaItem fields
 */
export interface AvailableVariable {
  key: string;              // Template variable key (e.g., 'title', 'numEpisodes')
  label: string;            // Display name (e.g., 'Title', 'Number of Episodes')
  type: 'string' | 'number' | 'array' | 'object'; // Data type for reference
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
 * Common variables (shared by both anime and manga)
 */
const COMMON_VARIABLES: AvailableVariable[] = [
  { key: 'title', label: 'Title', type: 'string' },
  { key: 'id', label: 'Media ID', type: 'number' },
  { key: 'category', label: 'Category (anime/manga)', type: 'string' },
  { key: 'platform', label: 'Platform', type: 'string' },
  { key: 'url', label: 'Source URL', type: 'string' },
  { key: 'synopsis', label: 'Synopsis', type: 'string' },
  { key: 'mediaType', label: 'Media Type (TV, Movie, etc)', type: 'string' },
  { key: 'status', label: 'Release Status (Finished/Ongoing/Upcoming)', type: 'string' },
  { key: 'mean', label: 'Average Score', type: 'number' },
  { key: 'genres', label: 'Genres', type: 'array' },
  { key: 'releasedStart', label: 'Release Start Date', type: 'string' },
  { key: 'releasedEnd', label: 'Release End Date', type: 'string' },
  { key: 'source', label: 'Source Material', type: 'string' },
  { key: 'userStatus', label: 'Your Status (Watching/Reading/Completed/etc)', type: 'string' },
  { key: 'userScore', label: 'Your Rating (0-10)', type: 'number' },
  { key: 'userStartDate', label: 'When You Started', type: 'string' },
  { key: 'userFinishDate', label: 'When You Finished', type: 'string' },
];

/**
 * Anime-specific variables
 */
export const ANIME_VARIABLES: AvailableVariable[] = [
  ...COMMON_VARIABLES,
  { key: 'numEpisodes', label: 'Total Episodes', type: 'number' },
  { key: 'numEpisodesWatched', label: 'Episodes Watched', type: 'number' },
  { key: 'studios', label: 'Studios (comma-separated)', type: 'array' },
  { key: 'duration', label: 'Episode Duration (minutes)', type: 'number' },
];

/**
 * Manga-specific variables
 */
export const MANGA_VARIABLES: AvailableVariable[] = [
  ...COMMON_VARIABLES,
  { key: 'numVolumes', label: 'Total Volumes', type: 'number' },
  { key: 'numVolumesRead', label: 'Volumes Read', type: 'number' },
  { key: 'numChapters', label: 'Total Chapters', type: 'number' },
  { key: 'numChaptersRead', label: 'Chapters Read', type: 'number' },
  { key: 'authors', label: 'Authors (comma-separated)', type: 'array' },
];

/**
 * Gets variable metadata by key
 */

export function getAvailableVariables(category: 'anime' | 'manga'): AvailableVariable[] {
  return category === 'anime' ? ANIME_VARIABLES : MANGA_VARIABLES;
}

/**
 * Gets available properties for a category
 */

export function getVariableLabel(key: string, category: 'anime' | 'manga'): string | undefined {
  const variables = getAvailableVariables(category);
  return variables.find(v => v.key === key)?.label;
}

/**
 * Default anime template
 * NOTE: 'cassetteSync' and 'updatedAt' are permanent properties that cannot be removed
 * Contains only common + anime-specific properties
 */
export const DEFAULT_ANIME_TEMPLATE: TemplateConfig = {
  folderPath: 'Cassette/Anime',
  properties: [
    // Core properties
    { id: 'prop-1', propertyName: 'title', template: '{{title}}', order: 1 },
    { id: 'prop-2', propertyName: 'status', template: '{{userStatus}}', order: 2 },
    { id: 'prop-3', propertyName: 'rating', template: '{{userScore}}/10', order: 3 },
    { id: 'prop-4', propertyName: 'episodes_seen', template: '{{numEpisodesWatched}}/{{numEpisodes}}', order: 4 },
    
    // Media info
    { id: 'prop-5', propertyName: 'media_type', template: '{{mediaType}}', order: 5 },
    { id: 'prop-6', propertyName: 'episodes', template: '{{numEpisodes}}', order: 6 },
    { id: 'prop-7', propertyName: 'studios', template: '{{studios}}', order: 7 },
    { id: 'prop-8', propertyName: 'genres', template: '{{genres}}', order: 8 },
    
    // Dates
    { id: 'prop-9', propertyName: 'aired', template: '{{releasedStart}} to {{releasedEnd}}', order: 9 },
    { id: 'prop-10', propertyName: 'started', template: '{{userStartDate}}', order: 10 },
    { id: 'prop-11', propertyName: 'finished', template: '{{userFinishDate}}', order: 11 },
    
    // Additional
    { id: 'prop-12', propertyName: 'score', template: '{{mean}}/10', order: 12 },
    { id: 'prop-13', propertyName: 'source', template: '{{url}}', order: 13 },
    { id: 'prop-14', propertyName: 'description', template: '{{synopsis}}', order: 14 },
    
    // Fixed properties
    { id: 'prop-permanent-1', propertyName: 'cassette', template: '{{cassette}}', order: 15 },
    { id: 'prop-permanent-2', propertyName: 'synced', template: '{{updatedAt}}', order: 16 },
  ]
};

/**
 * Default manga template
 * NOTE: 'cassetteSync' and 'updatedAt' are permanent properties that cannot be removed
 * Contains only common + manga-specific properties
 */
export const DEFAULT_MANGA_TEMPLATE: TemplateConfig = {
  folderPath: 'Cassette/Manga',
  properties: [
    { id: 'prop-1', propertyName: 'title', template: '{{title}}', order: 1 },
    { id: 'prop-2', propertyName: 'status', template: '{{userStatus}}', order: 2 },
    { id: 'prop-3', propertyName: 'rating', template: '{{userScore}}/10', order: 3 },
    { id: 'prop-4', propertyName: 'progress', template: '{{numChaptersRead}}/{{numChapters}} chapters', order: 4 },
    
    { id: 'prop-5', propertyName: 'media_type', template: '{{mediaType}}', order: 5 },
    { id: 'prop-6', propertyName: 'volumes', template: '{{numVolumes}}', order: 6 },
    { id: 'prop-7', propertyName: 'chapters', template: '{{numChapters}}', order: 7 },
    { id: 'prop-8', propertyName: 'authors', template: '{{authors}}', order: 8 },
    { id: 'prop-9', propertyName: 'genres', template: '{{genres}}', order: 9 },
    
    { id: 'prop-10', propertyName: 'published', template: '{{releasedStart}} to {{releasedEnd}}', order: 10 },
    { id: 'prop-11', propertyName: 'started', template: '{{userStartDate}}', order: 11 },
    { id: 'prop-12', propertyName: 'finished', template: '{{userFinishDate}}', order: 12 },
    
    { id: 'prop-13', propertyName: 'score', template: '{{mean}}/10', order: 13 },
    { id: 'prop-14', propertyName: 'source', template: '{{url}}', order: 14 },
    { id: 'prop-15', propertyName: 'description', template: '{{synopsis}}', order: 15 },
    
    { id: 'prop-permanent-1', propertyName: 'cassette', template: '{{cassette}}', order: 16 },
    { id: 'prop-permanent-2', propertyName: 'synced', template: '{{updatedAt}}', order: 17 },
  ]
};

/**
 * Generates a unique property ID
 */
export function generatePropertyId(): string {
  return `prop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}