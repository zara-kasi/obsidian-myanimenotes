/**
 * Frontmatter Builder
 * 
 * Builds frontmatter properties from media items with cassette as primary key
 * Handles merging with existing frontmatter while preserving user properties
 * UPDATED: Now includes sanitized genres for Obsidian tags
 */

import type { UniversalMediaItem } from '../../models';
import type { PropertyMapping } from './property-mapping';
import { getMappedPropertyName } from './property-mapping';
import { 
  sanitizeSynopsis,
  formatPropertyAsWikiLink,
  getFormatTypeForProperty,
  formatDuration,
  formatPlatformDisplay 
} from '../file-utils';
import * as yaml from 'js-yaml';

/**
 * Builds synced frontmatter properties including cassette
 * CRITICAL: cassette is always the first property (primary key)
 * UPDATED: genres property now contains tag-safe values
 */
export function buildSyncedFrontmatterProperties(
  item: UniversalMediaItem,
  mapping: PropertyMapping,
  cassetteSync: string
): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // CRITICAL: Add cassette as the first property (primary key)
  properties.cassette = cassetteSync;
  
  const addProperty = (key: keyof PropertyMapping, value: any) => {
  if (value !== undefined && value !== null && value !== '') {
    const mappedKey = getMappedPropertyName(key, mapping);
    
    // Wiki link formatting (for navigation/linking)
    const wikiLinkType = getWikiLinkFormatType(key);
    if (wikiLinkType) {
      properties[mappedKey] = formatPropertyAsWikiLink(value, wikiLinkType);
      return;
    }
    
    // Display formatting (for readability)
    if (key === 'duration') {
      properties[mappedKey] = formatDuration(value);
      return;
    }
    
    if (key === 'platform') {
      properties[mappedKey] = formatPlatformDisplay(value);
      return;
    }
    
    // Default: use value as-is
    properties[mappedKey] = value;
  }
};
  
  
  // Basic fields
  addProperty('id', item.id);
  addProperty('title', item.title);
  
  // Aliases (Obsidian's built-in property for alternative titles)
  if (item.alternativeTitles) {
    const aliases: string[] = [];
    if (item.alternativeTitles.en) aliases.push(item.alternativeTitles.en);
    if (item.alternativeTitles.ja) aliases.push(item.alternativeTitles.ja);
    if (item.alternativeTitles.synonyms) {
      aliases.push(...item.alternativeTitles.synonyms);
    }
    if (aliases.length > 0) {
      addProperty('aliases', aliases);
    }
  }
  
  addProperty('category', item.category);
  addProperty('platform', item.platform);
  
  // Platform URL (e.g., MyAnimeList page)
  if (item.url) {
    addProperty('url', item.url);
  }
  
  // Visual
  if (item.mainPicture) {
    addProperty('mainPicture', item.mainPicture.large || item.mainPicture.medium);
  }
  
  
  // Synopsis (sanitized - only commas and periods allowed)
  if (item.synopsis) {
    addProperty('synopsis', sanitizeSynopsis(item.synopsis));
  }
  
  // Metadata
  addProperty('mediaType', item.mediaType);
  addProperty('status', item.status);
  addProperty('mean', item.mean);
  
  // Genres - extract raw names from genre objects
if (item.genres && item.genres.length > 0) {
  const genreNames = item.genres.map(g => g.name);
  addProperty('genres', genreNames);
}
  
    // Add sync timestamp if available (for sync optimization)
  if (item.syncedAt) {
    addProperty('synced', item.syncedAt);
  }
  
  
// Origin material (common to both anime and manga)
  addProperty('source', item.source);
  
  // Publication/Airing dates (UNIFIED - common to both anime and manga)
  addProperty('releasedStart', item.releasedStart);
  addProperty('releasedEnd', item.releasedEnd);
  
  // Category-specific fields
  if (item.category === 'anime') {
    addProperty('numEpisodes', item.numEpisodes);
    addProperty('numEpisodesWatched', item.numEpisodesWatched);
    addProperty('studios', item.studios);
    addProperty('duration', item.duration);
  } else if (item.category === 'manga') {
    addProperty('numVolumes', item.numVolumes);
    addProperty('numVolumesRead', item.numVolumesRead);
    addProperty('numChapters', item.numChapters);
    addProperty('numChaptersRead', item.numChaptersRead);
    addProperty('authors', item.authors);
  }
  
  // User list data (COMMON to both anime and manga)
  addProperty('userStatus', item.userStatus);
  if (item.userScore !== undefined && item.userScore > 0) {
    addProperty('userScore', item.userScore);
  }
  addProperty('userStartDate', item.userStartDate);
  addProperty('userFinishDate', item.userFinishDate);

  // User list data
  addProperty('userStatus', item.userStatus);
  if (item.userScore !== undefined && item.userScore > 0) {
    addProperty('userScore', item.userScore);
  }
  
  return properties;
}

/**
 * Merges synced properties into existing frontmatter
 * Preserves all user-added properties that aren't controlled by sync
 */
export function mergeFrontmatter(
  existingFrontmatter: Record<string, any>,
  syncedProperties: Record<string, any>
): Record<string, any> {
  // Start with existing frontmatter to preserve user properties
  const merged = { ...existingFrontmatter };
  
  // Overlay synced properties (controlled fields)
  // This will update existing controlled fields or add new ones
  Object.entries(syncedProperties).forEach(([key, value]) => {
    merged[key] = value;
  });
  
  return merged;
}

/**
 * Property ordering configuration for frontmatter serialization
 * Lower numbers appear first in the output
 * Properties not listed here will appear at the end in alphabetical order
 */
const PROPERTY_ORDER: Record<string, number> = {
  'title': 1,
  'aliases': 2,
  'status': 3,
  'eps_seen': 4,
  'chap_read': 5,
  'vol_read': 6,
  'rating': 7,
  'started': 8,
  'finished': 9,
  'media': 10,
  'episodes': 11,
  'chapters': 12,
  'volumes': 13,
  'state': 14,
  'released': 15,
  'ended': 16,
  'studios': 17,
  'origin': 18,
  'genres': 19,
  'authors': 20,
  'duration': 21,
  'score': 22,
  'description': 23,
  'image': 24,
  'source': 25,
  'platform': 26,
  'category': 27,
  'id': 28,
  'cassette': 29,
  'synced': 30,
};

/**
 * Comparator function for sorting frontmatter properties
 * Maintains the order defined in PROPERTY_ORDER
 */
function compareProperties(a: string, b: string): number {
  const orderA = PROPERTY_ORDER[a] ?? 999;
  const orderB = PROPERTY_ORDER[b] ?? 999;
  
  // If both have defined order, sort by order
  if (orderA !== 999 || orderB !== 999) {
    return orderA - orderB;
  }
  
  // If neither have defined order, sort alphabetically
  return a.localeCompare(b);
}

/**
 * Serializes frontmatter to YAML string with consistent formatting
 * Properties are ordered according to PROPERTY_ORDER configuration
 */
export function serializeFrontmatter(frontmatter: Record<string, any>): string {
  // Create ordered object by sorting keys
  const ordered: Record<string, any> = {};
  
  const sortedKeys = Object.keys(frontmatter).sort(compareProperties);
  
  sortedKeys.forEach(key => {
    ordered[key] = frontmatter[key];
  });
  
  // Serialize to YAML with consistent formatting
  try {
    return yaml.dump(ordered, {
      indent: 2,
      lineWidth: -1, // No line wrapping
      noRefs: true, // Don't use YAML references
      sortKeys: false // Maintain our custom order
    });
  } catch (error) {
    console.error('[Frontmatter] Failed to serialize frontmatter:', error);
    throw new Error(`Failed to serialize frontmatter: ${error.message}`);
  }
}