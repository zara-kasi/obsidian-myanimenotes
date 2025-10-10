/**
 * Frontmatter Builder
 * 
 * Builds frontmatter properties from media items with cassette as primary key
 * Handles merging with existing frontmatter while preserving user properties
 * UPDATED: Now includes sanitized genres for Obsidian tags
 */

import type { UniversalMediaItem } from '../types';
import type { PropertyMapping } from './property-mapping';
import { getMappedPropertyName } from './property-mapping';
import { sanitizeSynopsis } from './file-utils';
import { sanitizeGenreObjectsForTags } from './file-utils';
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
  
  // Genres - UPDATED: Now sanitized for Obsidian tags
  // Converts genres like "Slice of Life" to "slice-of-life"
  // This allows users to use them as tags directly
  if (item.genres && item.genres.length > 0) {
    const sanitizedGenres = sanitizeGenreObjectsForTags(item.genres);
    if (sanitizedGenres.length > 0) {
      addProperty('genres', sanitizedGenres);
    }
  }
  
// Release year (common property - replaces season_year and season_name)
  // For anime: use startSeason.year
  // For manga: extract year from startDate
  if (item.startSeason?.year) {
    addProperty('released', item.startSeason.year);
  } else if (item.startDate) {
    // Extract year from ISO date string (format: YYYY-MM-DD)
    const year = parseInt(item.startDate.split('-')[0]);
    if (!isNaN(year)) {
      addProperty('released', year);
    }
  }
  
  // Origin material (common to both anime and manga)
  addProperty('source', item.source);
  
  // Category-specific fields
  if (item.category === 'anime') {
    addProperty('numEpisodes', item.numEpisodes);
    addProperty('numEpisodesWatched', item.numEpisodesWatched);
  } else if (item.category === 'manga') {
    addProperty('numVolumes', item.numVolumes);
    addProperty('numVolumesRead', item.numVolumesRead);
    addProperty('numChapters', item.numChapters);
    addProperty('numChaptersRead', item.numChaptersRead);
    
    // Authors (manga only)
    if (item.authors && item.authors.length > 0) {
      const authorNames = item.authors.map(a => 
        `${a.firstName} ${a.lastName}`.trim()
      ).filter(Boolean);
      if (authorNames.length > 0) {
        addProperty('authors', authorNames);
      }
    }
  }
  
  // User list data
  addProperty('userStatus', item.userStatus);
  if (item.userScore !== undefined && item.userScore > 0) {
    addProperty('userScore', item.userScore);
  }
  
  // Sync metadata
  addProperty('lastSynced', new Date(item.lastSynced || Date.now()).toISOString());
  
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
 * Serializes frontmatter to YAML string with consistent formatting
 * cassette is always positioned first as the primary key
 */
export function serializeFrontmatter(frontmatter: Record<string, any>): string {
  // Define property order with cassette first (primary key position)
  const propertyOrder = [
    'title',
    'aliases',
    'authors',
    'list',
    'rating',
    'eps_seen',
    'chapters_read',
    'volumes_read',
    'type',
    'status',
    'genres',
    'origin',
    'total_eps',
    'total_chapters',
    'total_volumes',
    'description',
    'score',
    'image',
    'source',
    'platform',
    'category',
    'released',
    'id',
    'cassette',
    'updated'
  ];
  
  // Create ordered object
  const ordered: Record<string, any> = {};
  
  // Add properties in defined order
  propertyOrder.forEach(key => {
    if (frontmatter.hasOwnProperty(key)) {
      ordered[key] = frontmatter[key];
    }
  });
  
  // Add any remaining properties not in the order list (user-defined properties)
  Object.keys(frontmatter).forEach(key => {
    if (!ordered.hasOwnProperty(key)) {
      ordered[key] = frontmatter[key];
    }
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