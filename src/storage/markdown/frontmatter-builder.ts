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
import type { TemplateConfig } from '../../settings/template-config';
import { 
  formatPropertyAsWikiLink,
  getWikiLinkFormatType,
  formatDuration,
} from '../file-utils';

/**
 * Resolves a template key to its value in UniversalMediaItem
 * Maps template variable names to actual item properties
 * 
 * @param item - The media item
 * @param key - Template variable key (e.g., 'numEpisodes', 'title')
 * @returns The resolved value or undefined if not found
 */
function resolvePropertyValue(
  item: UniversalMediaItem,
  key: string
): any {
  // Handle special permanent properties
  if (key === 'cassetteSync' || key === 'updatedAt') {
    return undefined; // These are handled separately
  }
  
  // Map of template keys to item properties
  const valueMap: Record<string, any> = {
    // Basic fields
    'id': item.id,
    'title': item.title,
    'category': item.category,
    'platform': item.platform,
    'url': item.url,
    
    // Visual
    'mainPicture': item.mainPicture?.large || item.mainPicture?.medium,
    
    // Alternative titles - extract as array for aliases
    'alternativeTitles': extractAliases(item.alternativeTitles),
    
    // Description
    'synopsis': item.synopsis,
    
    // Metadata
    'mediaType': item.mediaType,
    'status': item.status,
    'mean': item.mean,
    
    // Genres - extract names from genre objects
    'genres': item.genres?.map(g => g.name),
    
    // Dates
    'releasedStart': item.releasedStart,
    'releasedEnd': item.releasedEnd,
    
    // Source material
    'source': item.source,
    
    // Anime-specific
    'numEpisodes': item.numEpisodes,
    'numEpisodesWatched': item.numEpisodesWatched,
    'studios': item.studios,
    'duration': item.duration,
    
    // Manga-specific
    'numVolumes': item.numVolumes,
    'numVolumesRead': item.numVolumesRead,
    'numChapters': item.numChapters,
    'numChaptersRead': item.numChaptersRead,
    'authors': item.authors,
    
    // User data
    'userStatus': item.userStatus,
    'userScore': item.userScore,
    'userStartDate': item.userStartDate,
    'userFinishDate': item.userFinishDate,
  };
  
  return valueMap[key];
}

/**
 * Formats a property value based on its key type
 * Applies wiki links, duration formatting, etc.
 * 
 * @param key - Template variable key
 * @param value - Raw value to format
 * @returns Formatted value
 */
function formatPropertyValue(key: string, value: any): any {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  
  // Wiki link formatting
  const wikiLinkType = getWikiLinkFormatType(key);
  if (wikiLinkType) {
    return formatPropertyAsWikiLink(value, wikiLinkType);
  }
  
  // Duration formatting (minutes -> "2h 30m")
  if (key === 'duration') {
    return formatDuration(value);
  }
  
  // Default: return as-is
  return value;
}

/**
 * Extracts alternative titles as an array for Obsidian's aliases property
 */
function extractAliases(alternativeTitles: any): string[] | undefined {
  if (!alternativeTitles) return undefined;
  
  const aliases: string[] = [];
  if (alternativeTitles.en) aliases.push(alternativeTitles.en);
  if (alternativeTitles.ja) aliases.push(alternativeTitles.ja);
  if (alternativeTitles.synonyms) {
    aliases.push(...alternativeTitles.synonyms);
  }
  
  return aliases.length > 0 ? aliases : undefined;
}

/**
 * Builds frontmatter properties from template configuration
 * Processes template properties in order and resolves values from media item
 * 
 * @param item - Universal media item
 * @param template - Template configuration with property definitions
 * @param cassetteSync - Cassette identifier
 * @returns Frontmatter properties object
 */
export function buildFrontmatterFromTemplate(
  item: UniversalMediaItem,
  template: TemplateConfig,
  cassetteSync: string
): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // Process each template property in order
  for (const prop of template.properties) {
    // Handle permanent properties specially
    if (prop.key === 'cassetteSync') {
      properties[prop.customName] = cassetteSync;
      continue;
    }
    
    if (prop.key === 'updatedAt') {
      if (item.updatedAt) {
        properties[prop.customName] = item.updatedAt;
      }
      continue;
    }
    
    // Resolve value from item
    const rawValue = resolvePropertyValue(item, prop.key);
    
    // Skip if no value
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      continue;
    }
    
    // Apply formatting based on key type
    const formattedValue = formatPropertyValue(prop.key, rawValue);
    
    // Add to properties if we have a value after formatting
    if (formattedValue !== undefined && formattedValue !== null && formattedValue !== '') {
      properties[prop.customName] = formattedValue;
    }
  }
  
  return properties;
}

/**
 * Legacy export for backwards compatibility
 * @deprecated Use buildFrontmatterFromTemplate instead
 */
export const buildSyncedFrontmatterProperties = buildFrontmatterFromTemplate;
