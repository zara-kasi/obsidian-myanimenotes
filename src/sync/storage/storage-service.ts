import { TFile, Notice } from 'obsidian';
import type CassettePlugin from '../../main';
import type { UniversalMediaItem } from '../types';
import type { PropertyMapping } from './property-mapping';
import { getMappedPropertyName, DEFAULT_PROPERTY_MAPPING } from './property-mapping';
import * as yaml from 'js-yaml';

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
 * Sanitizes synopsis for YAML properties - only keeps commas and periods
 * All other special characters are removed or replaced with spaces
 */
function sanitizeSynopsis(synopsis: string | undefined): string {
  if (!synopsis) return '';
  
  return synopsis
    // Replace newlines, carriage returns, and tabs with spaces
    .replace(/[\n\r\t]/g, ' ')
    // Remove all special characters except commas and periods
    .replace(/[^\w\s,.]/g, '')
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim();
}

/**
 * Formats start_season as "season year" (e.g., "winter 2024")
 */
function formatStartSeason(season?: { year?: number; season?: string }): string | undefined {
  if (!season || !season.year || !season.season) return undefined;
  return `${season.season} ${season.year}`;
}

/**
 * Parses existing file content to extract frontmatter and body
 * Returns null if file doesn't exist or has invalid structure
 */
function parseExistingFile(content: string): { 
  frontmatter: Record<string, any>; 
  body: string;
} | null {
  // Check if content starts with frontmatter delimiter
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return null;
  }

  // Find the closing frontmatter delimiter
  const lines = content.split('\n');
  let closingIndex = -1;
  
  // Start from line 1 (skip the opening ---)
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  // No closing delimiter found
  if (closingIndex === -1) {
    return null;
  }

  // Extract frontmatter content (between the --- delimiters)
  const frontmatterText = lines.slice(1, closingIndex).join('\n');
  
  // Extract body content (everything after closing ---)
  const body = lines.slice(closingIndex + 1).join('\n');

  // Parse YAML frontmatter
  let frontmatter: Record<string, any> = {};
  try {
    const parsed = yaml.load(frontmatterText);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      frontmatter = parsed as Record<string, any>;
    }
  } catch (error) {
    console.warn('[Storage] Failed to parse existing frontmatter:', error);
    // Return empty frontmatter but preserve body
    return { frontmatter: {}, body };
  }

  return { frontmatter, body };
}

/**
 * Builds frontmatter properties from a media item
 * These are the "controlled" properties that sync will manage
 */
function buildSyncedFrontmatterProperties(
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
  
  // Synopsis (sanitized - only commas and periods allowed)
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
  
  // Season info (common to both anime and manga per updated reference)
  addProperty('seasonYear', item.startSeason?.year);
  addProperty('seasonName', item.startSeason?.season);
  
  // Source material (common to both anime and manga per updated reference)
  addProperty('source', item.source);
  
  // Category-specific fields
  if (item.category === 'anime') {
    addProperty('numEpisodes', item.numEpisodes);
    addProperty('numEpisodesWatched', item.numEpisodesWatched);
    
    // start_season as "season year" format (anime only)
    if (item.startSeason) {
      addProperty('startSeason', formatStartSeason(item.startSeason));
    }
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
function mergeFrontmatter(
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
 */
function serializeFrontmatter(frontmatter: Record<string, any>): string {
  // Define property order matching the reference document structure
  const propertyOrder = [
    'id',
    'title', 
    'aliases',
    'cover',
    'synopsis',
    'score',
    'type',
    'status',
    'genres',
    'total_episodes',
    'start_season',
    'source',
    'banner',
    'list',
    'rating',
    'episodes',
    'season_year',
    'season_name',
    'platform',
    'category',
    'total_volumes',
    'total_chapters',
    'authors',
    'volumes_read',
    'chapters_read',
    'last_synced'
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
    console.error('[Storage] Failed to serialize frontmatter:', error);
    throw new Error(`Failed to serialize frontmatter: ${error.message}`);
  }
}

/**
 * Generates complete markdown content with merged frontmatter and preserved body
 */
function generateMarkdownWithPreservedContent(
  item: UniversalMediaItem,
  config: StorageConfig,
  existingContent?: string
): string {
  const mapping = config.propertyMapping || DEFAULT_PROPERTY_MAPPING;
  
  // Build synced properties (controlled by sync system)
  const syncedProperties = buildSyncedFrontmatterProperties(item, mapping);
  
  // Parse existing file if it exists
  let finalFrontmatter: Record<string, any>;
  let body = ''; // Default to empty body for new files
  
  if (existingContent) {
    const parsed = parseExistingFile(existingContent);
    if (parsed) {
      // Merge: preserve existing frontmatter + user body
      finalFrontmatter = mergeFrontmatter(parsed.frontmatter, syncedProperties);
      body = parsed.body; // Preserve existing body exactly
      console.log('[Storage] Merged frontmatter and preserved body');
    } else {
      // File exists but has no valid frontmatter structure
      // Treat entire content as body and add new frontmatter
      finalFrontmatter = syncedProperties;
      body = existingContent; // Preserve entire content as body
      console.log('[Storage] No existing frontmatter found, preserving content as body');
    }
  } else {
    // New file: use synced properties only
    finalFrontmatter = syncedProperties;
    console.log('[Storage] Creating new file with synced frontmatter');
  }
  
  // Serialize frontmatter to YAML
  const yamlContent = serializeFrontmatter(finalFrontmatter);
  
  // Build final markdown content
  // Format: ---\n<yaml>\n---\n<body>
  return `---\n${yamlContent}---\n${body}`;
}

/**
 * Saves a media item to vault with safe frontmatter merging
 * SAFETY GUARANTEE: Preserves existing body content and non-synced frontmatter properties
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
  
  // Check if file exists and read its content
  const existingFile = vault.getAbstractFileByPath(filePath);
  let existingContent: string | undefined;
  
  if (existingFile instanceof TFile) {
    // Read existing content to preserve body and user properties
    existingContent = await vault.read(existingFile);
    console.log(`[Storage] Read existing file: ${filePath} (${existingContent.length} chars)`);
  }
  
  // Generate markdown content with safe merging
  // This preserves existing body and merges frontmatter properties
  const content = generateMarkdownWithPreservedContent(item, config, existingContent);
  
  if (existingFile instanceof TFile) {
    // Update existing file - frontmatter merged, body preserved
    await vault.modify(existingFile, content);
    console.log(`[Storage] Updated: ${filePath} (preserved body, merged frontmatter)`);
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