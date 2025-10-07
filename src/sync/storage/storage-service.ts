import { TFile, Notice } from 'obsidian';
import type CassettePlugin from '../../main';
import type { UniversalMediaItem } from '../types';
import type { PropertyMapping, PropertyTemplate } from './property-mapping';
import { 
  getMappedPropertyName, 
  getPropertyTemplate, 
  DEFAULT_PROPERTY_TEMPLATE 
} from './property-mapping';

/**
 * Storage configuration
 */
export interface StorageConfig {
  animeFolder: string;
  mangaFolder: string;
  createFolders: boolean;
  propertyMapping?: PropertyMapping;
  propertyTemplate?: PropertyTemplate;
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
 * Converts a value to YAML-safe format
 */
function toYAMLValue(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }
  
  if (typeof value === 'string') {
    // Escape quotes and wrap in quotes if contains special chars
    const needsQuotes = /[:#\[\]{}|>@`\n]/.test(value) || value.includes('"');
    if (needsQuotes) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    return value;
  }
  
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return '\n' + value.map(v => `  - ${toYAMLValue(v)}`).join('\n');
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
  mapping: PropertyMapping,
  template: string[]
): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // Helper to add property if it exists
  const addProperty = (key: keyof PropertyMapping, value: any) => {
    if (value !== undefined && value !== null && value !== '') {
      const mappedKey = getMappedPropertyName(key, mapping);
      properties[mappedKey] = value;
    }
  };
  
  // Add properties based on template order
  template.forEach(key => {
    switch (key) {
      case 'id':
        addProperty('id', item.id);
        break;
      case 'title':
        addProperty('title', item.title);
        break;
      case 'category':
        addProperty('category', item.category);
        break;
      case 'platform':
        addProperty('platform', item.platform);
        break;
      case 'mainPicture':
        if (item.mainPicture) {
          addProperty('mainPicture', item.mainPicture.large || item.mainPicture.medium);
        }
        break;
      case 'pictures':
        if (item.pictures && item.pictures.length > 0) {
          const urls = item.pictures
            .map(p => p.large || p.medium)
            .filter(Boolean);
          if (urls.length > 0) {
            addProperty('pictures', urls);
          }
        }
        break;
      case 'alternativeTitlesEn':
        addProperty('alternativeTitlesEn', item.alternativeTitles?.en);
        break;
      case 'alternativeTitlesJa':
        addProperty('alternativeTitlesJa', item.alternativeTitles?.ja);
        break;
      case 'alternativeTitlesSynonyms':
        if (item.alternativeTitles?.synonyms && item.alternativeTitles.synonyms.length > 0) {
          addProperty('alternativeTitlesSynonyms', item.alternativeTitles.synonyms);
        }
        break;
      case 'synopsis':
        addProperty('synopsis', item.synopsis);
        break;
      case 'mediaType':
        addProperty('mediaType', item.mediaType);
        break;
      case 'status':
        addProperty('status', item.status);
        break;
      case 'mean':
        addProperty('mean', item.mean);
        break;
      case 'genres':
        if (item.genres && item.genres.length > 0) {
          addProperty('genres', item.genres.map(g => g.name));
        }
        break;
      case 'numEpisodes':
        addProperty('numEpisodes', item.numEpisodes);
        break;
      case 'startSeasonYear':
        addProperty('startSeasonYear', item.startSeason?.year);
        break;
      case 'startSeasonName':
        addProperty('startSeasonName', item.startSeason?.season);
        break;
      case 'source':
        addProperty('source', item.source);
        break;
      case 'numVolumes':
        addProperty('numVolumes', item.numVolumes);
        break;
      case 'numChapters':
        addProperty('numChapters', item.numChapters);
        break;
      case 'authors':
        if (item.authors && item.authors.length > 0) {
          const authorNames = item.authors.map(a => 
            `${a.firstName} ${a.lastName}`.trim()
          ).filter(Boolean);
          if (authorNames.length > 0) {
            addProperty('authors', authorNames);
          }
        }
        break;
      case 'userStatus':
        addProperty('userStatus', item.userStatus);
        break;
      case 'userScore':
        if (item.userScore !== undefined && item.userScore > 0) {
          addProperty('userScore', item.userScore);
        }
        break;
      case 'numEpisodesWatched':
        addProperty('numEpisodesWatched', item.numEpisodesWatched);
        break;
      case 'numVolumesRead':
        addProperty('numVolumesRead', item.numVolumesRead);
        break;
      case 'numChaptersRead':
        addProperty('numChaptersRead', item.numChaptersRead);
        break;
      case 'lastSynced':
        addProperty('lastSynced', new Date(item.lastSynced || Date.now()).toISOString());
        break;
    }
  });
  
  return properties;
}

/**
 * Generates markdown content with only frontmatter (empty body)
 */
function generateMarkdown(
  item: UniversalMediaItem,
  config: StorageConfig
): string {
  const mapping = config.propertyMapping || {};
  
  // Get the appropriate template for the category
  const categoryTemplate = config.propertyTemplate 
    ? getPropertyTemplate(item.category as 'anime' | 'manga', config.propertyTemplate)
    : getPropertyTemplate(item.category as 'anime' | 'manga', { 
        anime: [], 
        manga: [] 
      } as any);
  
  // Build properties
  const properties = buildFrontmatterProperties(item, mapping, categoryTemplate);
  
  // Generate YAML frontmatter
  const lines: string[] = ['---'];
  
  Object.entries(properties).forEach(([key, value]) => {
    const yamlValue = toYAMLValue(value);
    if (yamlValue.startsWith('\n')) {
      // Array values
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