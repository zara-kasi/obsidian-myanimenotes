/**
 * Frontmatter Builder
 * 
 * Builds frontmatter properties from media items using TemplateConfig
 * ONLY uses templates - no more PropertyMapping
 */

import type { UniversalMediaItem } from '../../models';
import type { TemplateConfig } from '../../settings/template-config';
import { hasProperty, getPropertyName } from './template-helper';
import { 
  formatPropertyAsWikiLink,
  getWikiLinkFormatType,
  formatDuration,
} from '../file-utils';

/**
 * Builds synced frontmatter properties from template
 * CRITICAL: cassette is always the first property (primary key)
 * 
 * Returns plain JavaScript object - Obsidian's FileManager.processFrontMatter
 * will handle conversion to YAML and safe file writing
 */
export function buildFrontmatterFromTemplate(
  item: UniversalMediaItem,
  template: TemplateConfig,
  cassetteSync: string
): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // CRITICAL: Add cassette as the first property (primary key)
  // This is hardcoded and always present
  properties.cassette = cassetteSync;
  
  /**
   * Helper to add a property if it exists in template
   */
  const addProperty = (key: string, value: any) => {
    // Skip if property not in template
    if (!hasProperty(template, key)) {
      return;
    }
    
    // Skip if value is empty
    if (value === undefined || value === null || value === '') {
      return;
    }
    
    // Get custom property name from template
    const customName = getPropertyName(template, key);
    if (!customName) {
      return;
    }
    
    // Wiki link formatting (for navigation/linking)
    const wikiLinkType = getWikiLinkFormatType(key);
    if (wikiLinkType) {
      properties[customName] = formatPropertyAsWikiLink(value, wikiLinkType);
      return;
    }
    
    // Display formatting (for readability)
    if (key === 'duration') {
      properties[customName] = formatDuration(value);
      return;
    }
    
    // Default: use value as-is
    properties[customName] = value;
  };
  
  // Add sync timestamp (hardcoded, always present)
  if (hasProperty(template, 'synced') && item.syncedAt) {
    const syncedName = getPropertyName(template, 'synced');
    if (syncedName) {
      properties[syncedName] = item.syncedAt;
    }
  }
  
  // Basic fields
  addProperty('id', item.id);
  addProperty('title', item.title);
  
  // Aliases (Obsidian's built-in property for alternative titles)
  if (item.alternativeTitles && hasProperty(template, 'aliases')) {
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
  addProperty('url', item.url);
  
  // Visual
  if (item.mainPicture) {
    addProperty('mainPicture', item.mainPicture.large || item.mainPicture.medium);
  }
  
  // Synopsis
  addProperty('synopsis', item.synopsis);
  
  // Metadata
  addProperty('mediaType', item.mediaType);
  addProperty('status', item.status);
  addProperty('mean', item.mean);
  
  // Genres - extract raw names from genre objects
  if (item.genres && item.genres.length > 0) {
    const genreNames = item.genres.map(g => g.name);
    addProperty('genres', genreNames);
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
