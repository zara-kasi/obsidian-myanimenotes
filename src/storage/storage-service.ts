import type CassettePlugin from '../main';
import type { UniversalMediaItem } from '../models';
import type { PropertyMapping } from './markdown';
import { DEFAULT_PROPERTY_MAPPING, generateMarkdownWithCassetteSync, parseExistingFile } from './markdown';
import { 
  generateCassetteSync, 
  findFilesByCassetteSync, 
  findLegacyFiles, 
  selectDeterministicFile,
  withLock
} from './cassette';
import { ensureFolderExists, generateUniqueFilename } from './file-utils';
import { createDebugLogger } from '../utils';

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
  action: 'created' | 'updated' | 'linked-legacy' | 'duplicates-detected' | 'skipped';
  filePath: string;
  cassetteSync: string;
  duplicatePaths?: string[];
  message?: string;
}

/**
 * Checks if timestamps match (sync optimization)
 * Returns true if local and remote timestamps are equal
 */
function areTimestampsEqual(
  localSynced: string | undefined,
  remoteSynced: string | undefined
): boolean {
  if (!localSynced || !remoteSynced) {
    return false;
  }
  
  try {
    const localDate = new Date(localSynced);
    const remoteDate = new Date(remoteSynced);
    
    // Compare as Unix timestamps
    return localDate.getTime() === remoteDate.getTime();
  } catch (error) {
    return false;
  }
}

/**
 * Main save function with cassette-based lookup and timestamp optimization
 * 
 * SYNC OPTIMIZATION:
 * - Compares local 'synced' property with remote 'updated_at' timestamp
 * - Skips file overwrite if timestamps match (unless forceFullSync is enabled)
 * - Always updates if timestamp is missing or different
 * 
 * CRITICAL: Sync is based ONLY on cassette, NOT on filename or folder location
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
  
  // Use withLock wrapper for automatic lock management
  return await withLock(cassetteSync, async () => {
    // Determine target folder
    const folderPath = item.category === 'anime' ? config.animeFolder : config.mangaFolder;
    
    if (config.createFolders) {
      await ensureFolderExists(plugin, folderPath);
    }
    
    // STEP 1: Lookup by cassette frontmatter across ENTIRE VAULT
    const matchingFiles = await findFilesByCassetteSync(plugin, cassetteSync, folderPath);
    
    if (matchingFiles.length > 1) {
      // DUPLICATE DETECTION: Multiple files with same cassette
      console.warn(`[Storage] Found ${matchingFiles.length} files with cassette: ${cassetteSync}`);
      
      const selectedFile = selectDeterministicFile(plugin, matchingFiles);
      const existingContent = await vault.read(selectedFile);
      
      // Parse existing file to check timestamp
      const parsed = parseExistingFile(existingContent);
      const localSynced = parsed?.frontmatter?.synced;
      
      // Check if we can skip this update (timestamp optimization)
      if (!plugin.settings.forceFullSync && areTimestampsEqual(localSynced, item.syncedAt)) {
        debug.log(`[Storage] Skipping ${selectedFile.path} - timestamps match`);
        return {
          action: 'skipped',
          filePath: selectedFile.path,
          cassetteSync,
          message: `Skipped ${selectedFile.path} - no changes (timestamp match)`
        };
      }
      
      const content = generateMarkdownWithCassetteSync(plugin, item, config, cassetteSync, existingContent);
      await vault.modify(selectedFile, content);
      
      return {
        action: 'duplicates-detected',
        filePath: selectedFile.path,
        cassetteSync,
        duplicatePaths: matchingFiles.map(f => f.path),
        message: `Updated ${selectedFile.path} but found ${matchingFiles.length} duplicates`
      };
    }
    
    if (matchingFiles.length === 1) {
      // EXACT MATCH: Check if update needed via timestamp
      const file = matchingFiles[0];
      const existingContent = await vault.read(file);
      
      // Parse existing file to check timestamp
      const parsed = parseExistingFile(existingContent);
      const localSynced = parsed?.frontmatter?.synced;
      
      // SYNC OPTIMIZATION: Skip if timestamps match
      if (!plugin.settings.forceFullSync && areTimestampsEqual(localSynced, item.syncedAt)) {
        debug.log(`[Storage] Skipping ${file.path} - timestamps match (local: ${localSynced}, remote: ${item.syncedAt})`);
        return {
          action: 'skipped',
          filePath: file.path,
          cassetteSync,
          message: `Skipped ${file.path} - no changes detected`
        };
      }
      
      // Timestamps differ or forceFullSync enabled - update file
      debug.log(`[Storage] Updating ${file.path} - timestamp changed or force sync enabled`);
      const content = generateMarkdownWithCassetteSync(plugin, item, config, cassetteSync, existingContent);
      
      await vault.modify(file, content);
      
      return {
        action: 'updated',
        filePath: file.path,
        cassetteSync,
        message: `Updated ${file.path}`
      };
    }
    
    // STEP 2: No cassette match - try legacy file detection
    debug.log(`[Storage] No cassette match, attempting legacy detection in ${folderPath}...`);
    const legacyCandidates = await findLegacyFiles(plugin, item, folderPath);
    
    if (legacyCandidates.length > 0) {
      if (legacyCandidates.length > 1) {
        console.warn(`[Storage] Found ${legacyCandidates.length} legacy candidates for ${cassetteSync}`);
      }
      
      const selectedFile = selectDeterministicFile(plugin, legacyCandidates);
      debug.log(`[Storage] Migrating legacy file: ${selectedFile.path}`);
      
      const existingContent = await vault.read(selectedFile);
      const content = generateMarkdownWithCassetteSync(plugin, item, config, cassetteSync, existingContent);
      
      await vault.modify(selectedFile, content);
      
      return {
        action: 'linked-legacy',
        filePath: selectedFile.path,
        cassetteSync,
        duplicatePaths: legacyCandidates.length > 1 ? legacyCandidates.map(f => f.path) : undefined,
        message: `Migrated legacy file ${selectedFile.path} (added cassette)`
      };
    }
    
    // STEP 3: No existing file - create new file
    debug.log(`[Storage] Creating new file for ${cassetteSync}`);
    
    const sanitizedTitle = item.title.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
    let filename = `${sanitizedTitle}.md`;
    
    const existingByName = vault.getAbstractFileByPath(`${folderPath}/${filename}`);
    if (existingByName) {
      debug.log(`[Storage] Filename collision detected, generating unique name`);
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
  });
}

/**
 * Saves multiple media items
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
      } else if (result.action === 'linked-legacy') {
        debug.log(`[Storage] ${result.message}`);
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