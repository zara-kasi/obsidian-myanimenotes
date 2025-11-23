/**
 * Frontmatter Builder
 * 
 * Builds frontmatter properties from media items with cassette as primary key
 * Handles merging with existing frontmatter while preserving user properties
 * 
 * REFACTORED: Removed manual YAML serialization
 * Now returns plain objects - Obsidian's FileManager.processFrontMatter handles YAML
 */

import type { UniversalMediaItem } from '../../models';
import type { PropertyMapping } from './property-mapping';
import { getMappedPropertyName } from './property-mapping';
import { 
  formatPropertyAsWikiLink,
  getWikiLinkFormatType,
  formatDuration,
} from '../file-utils';

/**
 * Builds synced frontmatter properties including cassette
 * CRITICAL: cassette is always the first property (primary key)
 * 
 * Returns plain JavaScript object - Obsidian's FileManager.processFrontMatter
 * will handle conversion to YAML and safe file writing
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
  
  // Synopsis
  if (item.synopsis) {
    addProperty('synopsis', item.synopsis);
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
  
  return properties;
}