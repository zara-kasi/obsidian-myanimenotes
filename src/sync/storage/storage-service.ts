import { TFile, Notice } from 'obsidian';
import type CassettePlugin from '../../main';
import type { UniversalMediaItem } from '../types';
import type { PropertyMapping } from './property-mapping';
import { getMappedPropertyName, DEFAULT_PROPERTY_MAPPING } from './property-mapping';

/**
 * Storage configuration
 */
export interface StorageConfig {
  animeFolder: string;
  mangaFolder: string;
  createFolders: boolean;
  propertyMapping?: PropertyMapping;
}

/**
 * Ensures a folder exists, creating it if necessary
 */
async function ensureFolderExists(plugin: CassettePlugin, folderPath: string): Promise<void> {
  const { vault } = plugin.app;
  const folder = vault.getAbstractFileByPath(folderPath);
  
  if (!folder) {
    await vault.createFolder(folderPath);
    console.log(`[Storage] Created folder: ${folderPath}`);
  }
}

/**
 * Sanitizes a filename by removing invalid characters
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Converts synopsis to plain text, escaping special characters
 */
function sanitizeSynopsis(synopsis: string | undefined): string {
  if (!synopsis) return '';
  
  // Replace problematic characters that might break YAML
  return synopsis
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/"/g, '\\"')    // Escape quotes
    .replace(/\n/g, ' ')     // Replace newlines with spaces
    .replace(/\r/g, '')      // Remove carriage returns
    .replace(/\t/g, ' ')     // Replace tabs with spaces
    .trim();
}

/**
 * Converts a value to YAML-safe format
 */
function toYAMLValue(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  
  if (typeof value === 'string') {
    // Always wrap strings in quotes for safety
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return '\n' + value.map(v => {
      if (typeof v === 'string') {
        return `  - "${v.replace(/"/g, '\\"')}"`;
      }
      return `  - ${v}`;
    }).join('\n');
  }
  
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

/**
 * Builds frontmatter properties from a media item
 */
function buildFrontmatterProperties(
  item: UniversalMediaItem,
  mapping: PropertyMapping
): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // Helper to add property if it exists
  const addProperty = (key: keyof PropertyMapping, value: any) => {
    if (value !== undefined && value !== null && value !== '') {
      const mappedKey = getMappedPropertyName(key, mapping);
      properties[mappedKey] = value;
    }
  };
  
  // Basic fields
  addProperty('id', item.id);
  addProperty('title', item.title);
  addProperty('category', item.category);
  addProperty('platform', item.platform);
  
  // Visual
  if (item.mainPicture) {
    addProperty('mainPicture', item.mainPicture.large || item.mainPicture.medium);
  }
  
  // Banner (additional pictures) - use first additional picture if available
  if (item.pictures && item.pictures.length > 0) {
    const bannerUrl = item.pictures[0].large || item.pictures[0].medium;
    if (bannerUrl) {
      addProperty('pictures', bannerUrl);
    }
  }
  
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
  
  // Synopsis (sanitized for YAML safety)
  if (item.synopsis) {
    addProperty('synopsis', sanitizeSynopsis(item.synopsis));
  }
  
  // Metadata
  addProperty('mediaType', item.mediaType);
  addProperty('status', item.status);
  addProperty('mean', item.mean);
  
  // Genres
  if (item.genres && item.genres.length > 0) {
    addProperty('genres', item.genres.map(g => g.name));
  }
  
  // Category-specific fields
  if (item.category === 'anime') {
    addProperty('numEpisodes', item.numEpisodes);
    addProperty('numEpisodesWatched', item.numEpisodesWatched);
    addProperty('startSeasonYear', item.startSeason?.year);
    addProperty('startSeasonName', item.startSeason?.season);
    addProperty('source', item.source);
  } else if (item.category === 'manga') {
    addProperty('numVolumes', item.numVolumes);
    addProperty('numVolumesRead', item.numVolumesRead);
    addProperty('numChapters', item.numChapters);
    addProperty('numChaptersRead', item.numChaptersRead);
    
    // Authors
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
 * Generates markdown content with only frontmatter (empty body)
 */
function generateMarkdown(
  item: UniversalMediaItem,
  config: StorageConfig
): string {
  const mapping = config.propertyMapping || DEFAULT_PROPERTY_MAPPING;
  
  // Build properties
  const properties = buildFrontmatterProperties(item, mapping);
  
  // Generate YAML frontmatter
  const lines: string[] = ['---'];
  
  // Define property order for consistent output
  const propertyOrder = [
    'id', 'title', 'aliases', 'category', 'platform', 'type', 
    'status', 'list', 'rating', 'score',
    // Anime-specific
    'total_episodes', 'episodes', 'season_year', 'season_name', 'source',
    // Manga-specific  
    'total_volumes', 'volumes_read', 'total_chapters', 'chapters_read', 'authors',
    // Common
    'genres', 'cover', 'banner', 'synopsis', 'last_synced'
  ];
  
  // Add properties in order
  propertyOrder.forEach(key => {
    if (properties.hasOwnProperty(key)) {
      const value = properties[key];
      const yamlValue = toYAMLValue(value);
      if (yamlValue.startsWith('\n')) {
        // Array values
        lines.push(`${key}:${yamlValue}`);
      } else {
        lines.push(`${key}: ${yamlValue}`);
      }
      delete properties[key]; // Remove so we don't add it again
    }
  });
  
  // Add any remaining properties not in the order list
  Object.entries(properties).forEach(([key, value]) => {
    const yamlValue = toYAMLValue(value);
    if (yamlValue.startsWith('\n')) {
      lines.push(`${key}:${yamlValue}`);
    } else {
      lines.push(`${key}: ${yamlValue}`);
    }
  });
  
  lines.push('---');
  lines.push(''); // Empty body
  
  return lines.join('\n');
}

/**
 * Saves a media item to vault (frontmatter only)
 */
export async function saveMediaItem(
  plugin: CassettePlugin,
  item: UniversalMediaItem,
  config: StorageConfig
): Promise<string> {
  const { vault } = plugin.app;
  
  // Determine folder based on category
  const folderPath = item.category === 'anime' ? config.animeFolder : config.mangaFolder;
  
  // Ensure folder exists
  if (config.createFolders) {
    await ensureFolderExists(plugin, folderPath);
  }
  
  // Create filename
  const sanitizedTitle = sanitizeFilename(item.title);
  const filename = `${sanitizedTitle}.md`;
  const filePath = `${folderPath}/${filename}`;
  
  // Generate markdown content (frontmatter only)
  const content = generateMarkdown(item, config);
  
  // Check if file exists
  const existingFile = vault.getAbstractFileByPath(filePath);
  
  if (existingFile instanceof TFile) {
    // Update existing file
    await vault.modify(existingFile, content);
    console.log(`[Storage] Updated: ${filePath}`);
  } else {
    // Create new file
    await vault.create(filePath, content);
    console.log(`[Storage] Created: ${filePath}`);
  }
  
  return filePath;
}

/**
 * Saves multiple media items to vault
 */
export async function saveMediaItems(
  plugin: CassettePlugin,
  items: UniversalMediaItem[],
  config: StorageConfig
): Promise<string[]> {
  const paths: string[] = [];
  
  new Notice(`💾 Saving ${items.length} items...`, 2000);
  
  for (const item of items) {
    try {
      const path = await saveMediaItem(plugin, item, config);
      paths.push(path);
    } catch (error) {
      console.error(`[Storage] Failed to save ${item.title}:`, error);
      new Notice(`❌ Failed to save: ${item.title}`, 3000);
    }
  }
  
  new Notice(`✅ Saved ${paths.length} items to vault`, 3000);
  
  return paths;
}

/**
 * Saves items grouped by category
 */
export async function saveMediaItemsByCategory(
  plugin: CassettePlugin,
  items: UniversalMediaItem[],
  config: StorageConfig
): Promise<{ anime: string[]; manga: string[] }> {
  const animePaths: string[] = [];
  const mangaPaths: string[] = [];
  
  const animeItems = items.filter(item => item.category === 'anime');
  const mangaItems = items.filter(item => item.category === 'manga');
  
  if (animeItems.length > 0) {
    new Notice(`💾 Saving ${animeItems.length} anime items...`, 2000);
    const paths = await saveMediaItems(plugin, animeItems, config);
    animePaths.push(...paths);
  }
  
  if (mangaItems.length > 0) {
    new Notice(`💾 Saving ${mangaItems.length} manga items...`, 2000);
    const paths = await saveMediaItems(plugin, mangaItems, config);
    mangaPaths.push(...paths);
  }
  
  return { anime: animePaths, manga: mangaPaths };
}