import type CassettePlugin from '../main';
import type { UniversalMediaItem } from '../models';
import type { PropertyMapping } from './markdown';
import { DEFAULT_PROPERTY_MAPPING, generateMarkdownWithCassetteSync } from './markdown';
import { 
  generateCassetteSync, 
  findFilesByCassetteSync, 
  findLegacyFiles, 
  selectDeterministicFile,
  acquireSyncLock,
  releaseSyncLock
} from './cassette';
import { ensureFolderExists, generateUniqueFilename } from './file-utils';
import { createDebugLogger } from '../utils';
import { createHash } from 'crypto';

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
 * Sync action result
 */
export interface SyncActionResult {
  action: 'created' | 'updated' | 'skipped' | 'linked-legacy' | 'duplicates-detected';
  filePath: string;
  cassetteSync: string;
  duplicatePaths?: string[];
  message?: string;
}

/**
 * Generates SHA-256 hash of content for change detection
 * Uses crypto for reliable, fast hashing
 */
function generateContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Checks if content has changed by comparing hashes
 * Returns true if content is different (needs update)
 */
function hasContentChanged(existingContent: string, newContent: string): boolean {
  const existingHash = generateContentHash(existingContent);
  const newHash = generateContentHash(newContent);
  return existingHash !== newHash;
}

/**
 * Main save function with change detection
 * 
 * CHANGE DETECTION STRATEGY:
 * - For existing files: Compare content hash before writing
 * - Only write if hash differs (actual data changed)
 * - New files: Always write (no comparison needed)
 * - Reports 'skipped' action when no changes detected
 */
export async function saveMediaItem(
  plugin: CassettePlugin,
  item: UniversalMediaItem,
  config: StorageConfig
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  const { vault } = plugin.app;
  
  // Generate cassette identifier (format: provider:category:id)
  const cassetteSync = generateCassetteSync(item);
  debug.log(`[Storage] Processing item with cassette: ${cassetteSync}`);
  
  // Acquire lock to prevent concurrent operations on same ID
  await acquireSyncLock(cassetteSync);
  
  try {
    // Determine target folder
    const folderPath = item.category === 'anime' ? config.animeFolder : config.mangaFolder;
    
    if (config.createFolders) {
      await ensureFolderExists(plugin, folderPath);
    }
    
    // STEP 1: Lookup by cassette frontmatter across ENTIRE VAULT
    const matchingFiles = await findFilesByCassetteSync(plugin, cassetteSync, folderPath);
    
    if (matchingFiles.length > 1) {
      // DUPLICATE DETECTION
      console.warn(`[Storage] Found ${matchingFiles.length} files with cassette: ${cassetteSync}`);
      
      const selectedFile = selectDeterministicFile(plugin, matchingFiles);
      const existingContent = await vault.read(selectedFile);
      const newContent = generateMarkdownWithCassetteSync(plugin, item, config, cassetteSync, existingContent);
      
      // CHECK FOR CHANGES
      if (!hasContentChanged(existingContent, newContent)) {
        debug.log(`[Storage] No changes detected for: ${selectedFile.path}`);
        return {
          action: 'skipped',
          filePath: selectedFile.path,
          cassetteSync,
          message: `No changes - skipped ${selectedFile.path}`
        };
      }
      
      await vault.modify(selectedFile, newContent);
      
      return {
        action: 'duplicates-detected',
        filePath: selectedFile.path,
        cassetteSync,
        duplicatePaths: matchingFiles.map(f => f.path),
        message: `Updated ${selectedFile.path} but found ${matchingFiles.length} duplicates`
      };
    }
    
    if (matchingFiles.length === 1) {
      // EXACT MATCH: Check for changes before updating
      const file = matchingFiles[0];
      debug.log(`[Storage] Found existing file: ${file.path}`);
      
      const existingContent = await vault.read(file);
      const newContent = generateMarkdownWithCassetteSync(plugin, item, config, cassetteSync, existingContent);
      
      // CHECK FOR CHANGES - This is the key optimization
      if (!hasContentChanged(existingContent, newContent)) {
        debug.log(`[Storage] No changes detected for: ${file.path}`);
        return {
          action: 'skipped',
          filePath: file.path,
          cassetteSync,
          message: `No changes - skipped ${file.path}`
        };
      }
      
      // Content changed - update file
      debug.log(`[Storage] Changes detected - updating: ${file.path}`);
      await vault.modify(file, newContent);
      
      return {
        action: 'updated',
        filePath: file.path,
        cassetteSync,
        message: `Updated ${file.path} (content changed)`
      };
    }
    
    // STEP 2: No cassette match - try legacy file detection
    debug.log(`[Storage] No cassette match, attempting legacy detection...`);
    const legacyCandidates = await findLegacyFiles(plugin, item, folderPath);
    
    if (legacyCandidates.length > 0) {
      const selectedFile = selectDeterministicFile(plugin, legacyCandidates);
      debug.log(`[Storage] Migrating legacy file: ${selectedFile.path}`);
      
      const existingContent = await vault.read(selectedFile);
      const newContent = generateMarkdownWithCassetteSync(plugin, item, config, cassetteSync, existingContent);
      
      // For legacy migration, always update (adding cassette is a change)
      await vault.modify(selectedFile, newContent);
      
      return {
        action: 'linked-legacy',
        filePath: selectedFile.path,
        cassetteSync,
        message: `Migrated legacy file ${selectedFile.path}`
      };
    }
    
    // STEP 3: No existing file - create new file
    debug.log(`[Storage] Creating new file for ${cassetteSync}`);
    
    const sanitizedTitle = item.title.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
    let filename = `${sanitizedTitle}.md`;
    
    // Check for filename collision
    const existingByName = vault.getAbstractFileByPath(`${folderPath}/${filename}`);
    if (existingByName) {
      filename = generateUniqueFilename(plugin, vault, folderPath, filename);
    }
    
    const filePath = `${folderPath}/${filename}`;
    const content = generateMarkdownWithCassetteSync(plugin, item, config, cassetteSync);
    
    await vault.create(filePath, content);
    
    return {
      action: 'created',
      filePath,
      cassetteSync,
      message: `Created ${filePath}`
    };
    
  } finally {
    // Always release lock
    releaseSyncLock(cassetteSync);
  }
}

/**
 * Saves multiple media items with change detection
 */
export async function saveMediaItems(
  plugin: CassettePlugin,
  items: UniversalMediaItem[],
  config: StorageConfig
): Promise<SyncActionResult[]> {
  const debug = createDebugLogger(plugin, 'Storage');
  const results: SyncActionResult[] = [];
  
  for (const item of items) {
    try {
      const result = await saveMediaItem(plugin, item, config);
      results.push(result);
      
      // Log important events
      if (result.action === 'duplicates-detected') {
        console.warn(`[Storage] ${result.message}`);
      } else if (result.action === 'skipped') {
        debug.log(`[Storage] ${result.message}`);
      }
    } catch (error) {
      console.error(`[Storage] Failed to save ${item.title}:`, error);
    }
  }
  
  return results;
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
    const results = await saveMediaItems(plugin, animeItems, config);
    animePaths.push(...results.map(r => r.filePath));
  }
  
  if (mangaItems.length > 0) {
    const results = await saveMediaItems(plugin, mangaItems, config);
    mangaPaths.push(...results.map(r => r.filePath));
  }
  
  return { anime: animePaths, manga: mangaPaths };
}