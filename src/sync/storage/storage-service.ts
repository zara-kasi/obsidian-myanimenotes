// src/sync/storage/storage-service.ts
// Handles storage of synced media items

import { TFile, TFolder, Notice } from 'obsidian';
import type CassettePlugin from '../../main';
import type { UniversalMediaItem, MediaCategory } from '../types';

/**
 * Storage configuration
 */
export interface StorageConfig {
  animeFolder: string;
  mangaFolder: string;
  createFolders: boolean;
}

/**
 * Default storage configuration
 */
const DEFAULT_CONFIG: StorageConfig = {
  animeFolder: 'Cassette/Anime',
  mangaFolder: 'Cassette/Manga',
  createFolders: true,
};

/**
 * Ensures a folder exists, creating it if necessary
 * @param plugin Plugin instance
 * @param folderPath Path to folder
 */
async function ensureFolderExists(plugin: CassettePlugin, folderPath: string): Promise<void> {
  const { vault } = plugin.app;
  
  // Check if folder exists
  const folder = vault.getAbstractFileByPath(folderPath);
  
  if (!folder) {
    // Create folder
    await vault.createFolder(folderPath);
    console.log(`[Storage] Created folder: ${folderPath}`);
  }
}

/**
 * Sanitizes a filename by removing invalid characters
 * @param filename Original filename
 * @returns Sanitized filename
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\\/:*?"<>|]/g, '-') // Replace invalid chars
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();
}

/**
 * Generates markdown content for a media item
 * @param item Universal media item
 * @returns Markdown content
 */
function generateMarkdown(item: UniversalMediaItem): string {
  const lines: string[] = [];
  
  // Frontmatter
  lines.push('---');
  lines.push(`id: ${item.id}`);
  lines.push(`title: "${item.title.replace(/"/g, '\\"')}"`);
  lines.push(`category: ${item.category}`);
  lines.push(`platform: ${item.platform}`);
  
  if (item.mediaType) {
    lines.push(`type: ${item.mediaType}`);
  }
  
  if (item.userStatus) {
    lines.push(`status: ${item.userStatus}`);
  }
  
  if (item.userScore !== undefined && item.userScore > 0) {
    lines.push(`score: ${item.userScore}`);
  }
  
  if (item.mean !== undefined) {
    lines.push(`averageScore: ${item.mean}`);
  }
  
  if (item.genres && item.genres.length > 0) {
    lines.push(`genres:`);
    item.genres.forEach(genre => {
      lines.push(`  - ${genre.name}`);
    });
  }
  
  lines.push(`lastSynced: ${new Date(item.lastSynced || Date.now()).toISOString()}`);
  lines.push('---');
  lines.push('');
  
  // Main content
  lines.push(`# ${item.title}`);
  lines.push('');
  
  // Alternative titles
  if (item.alternativeTitles) {
    const { en, ja, synonyms } = item.alternativeTitles;
    
    if (en || ja || (synonyms && synonyms.length > 0)) {
      lines.push('## Alternative Titles');
      if (en) lines.push(`- **English:** ${en}`);
      if (ja) lines.push(`- **Japanese:** ${ja}`);
      if (synonyms && synonyms.length > 0) {
        lines.push(`- **Synonyms:** ${synonyms.join(', ')}`);
      }
      lines.push('');
    }
  }
  
  // Image
  if (item.mainPicture?.large || item.mainPicture?.medium) {
    const imgUrl = item.mainPicture.large || item.mainPicture.medium;
    lines.push(`![${item.title}](${imgUrl})`);
    lines.push('');
  }
  
  // Synopsis
  if (item.synopsis) {
    lines.push('## Synopsis');
    lines.push(item.synopsis);
    lines.push('');
  }
  
  // Details section
  lines.push('## Details');
  lines.push('');
  
  if (item.category === 'anime') {
    if (item.numEpisodes) {
      lines.push(`- **Episodes:** ${item.numEpisodes}`);
    }
    if (item.numEpisodesWatched !== undefined) {
      lines.push(`- **Episodes Watched:** ${item.numEpisodesWatched}`);
    }
    if (item.startSeason) {
      lines.push(`- **Season:** ${item.startSeason.season} ${item.startSeason.year}`);
    }
    if (item.source) {
      lines.push(`- **Source:** ${item.source}`);
    }
  } else if (item.category === 'manga') {
    if (item.numVolumes) {
      lines.push(`- **Volumes:** ${item.numVolumes}`);
    }
    if (item.numVolumesRead !== undefined) {
      lines.push(`- **Volumes Read:** ${item.numVolumesRead}`);
    }
    if (item.numChapters) {
      lines.push(`- **Chapters:** ${item.numChapters}`);
    }
    if (item.numChaptersRead !== undefined) {
      lines.push(`- **Chapters Read:** ${item.numChaptersRead}`);
    }
    if (item.authors && item.authors.length > 0) {
      lines.push(`- **Authors:** ${item.authors.map(a => `${a.firstName} ${a.lastName}`).join(', ')}`);
    }
  }
  
  lines.push(`- **Status:** ${item.status}`);
  lines.push(`- **Type:** ${item.mediaType}`);
  
  if (item.mean) {
    lines.push(`- **Average Score:** ${item.mean}/10`);
  }
  
  lines.push('');
  
  // User progress section
  if (item.userStatus || item.userScore) {
    lines.push('## My Progress');
    lines.push('');
    
    if (item.userStatus) {
      lines.push(`- **Status:** ${item.userStatus}`);
    }
    if (item.userScore !== undefined && item.userScore > 0) {
      lines.push(`- **My Score:** ${item.userScore}/10`);
    }
    
    lines.push('');
  }
  
  // Links
  lines.push('## Links');
  lines.push('');
  
  if (item.platform === 'mal') {
    const urlType = item.category === 'anime' ? 'anime' : 'manga';
    lines.push(`- [MyAnimeList](https://myanimelist.net/${urlType}/${item.id})`);
  }
  
  lines.push('');
  
  // Metadata footer
  lines.push('---');
  lines.push('');
  lines.push(`*Synced from ${item.platform.toUpperCase()} on ${new Date(item.lastSynced || Date.now()).toLocaleString()}*`);
  
  return lines.join('\n');
}

/**
 * Saves a media item to vault
 * @param plugin Plugin instance
 * @param item Universal media item
 * @param config Storage configuration
 * @returns Path to created/updated file
 */
export async function saveMediaItem(
  plugin: CassettePlugin,
  item: UniversalMediaItem,
  config: StorageConfig = DEFAULT_CONFIG
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
  
  // Generate markdown content
  const content = generateMarkdown(item);
  
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
 * @param plugin Plugin instance
 * @param items Array of universal media items
 * @param config Storage configuration
 * @returns Array of file paths
 */
export async function saveMediaItems(
  plugin: CassettePlugin,
  items: UniversalMediaItem[],
  config: StorageConfig = DEFAULT_CONFIG
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
 * @param plugin Plugin instance
 * @param items Array of universal media items
 * @param config Storage configuration
 * @returns Object with anime and manga paths
 */
export async function saveMediaItemsByCategory(
  plugin: CassettePlugin,
  items: UniversalMediaItem[],
  config: StorageConfig = DEFAULT_CONFIG
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