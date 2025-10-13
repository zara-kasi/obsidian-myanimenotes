import { Notice } from 'obsidian';
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
  action: 'created' | 'updated' | 'linked-legacy' | 'duplicates-detected';
  filePath: string;
  cassetteSync: string;
  duplicatePaths?: string[];
  message?: string;
}

/**
 * Main save function with cassette-based lookup
 * 
 * CRITICAL: Sync is based ONLY on cassette, NOT on filename or folder location
 * 
 * HOW IT WORKS:
 * - Searches the ENTIRE VAULT for files with matching cassette
 * - Users can move files anywhere - sync will find them
 * - Users can rename files - sync will still update them
 * - Filename is ONLY used when creating NEW files
 * - Once a file has cassette, filename becomes irrelevant
 * 
 * LOOKUP ORDER:
 * 1. Search ENTIRE VAULT by cassette frontmatter (exact match)
 * 2. If multiple found: report duplicates, pick deterministic file
 * 3. If none found: try legacy file detection (only in target folder)
 * 4. If still none: create new file with cassette
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
    // This allows users to move/rename files without breaking sync
    const matchingFiles = await findFilesByCassetteSync(plugin, cassetteSync, folderPath);
    
    if (matchingFiles.length > 1) {
      // DUPLICATE DETECTION: Multiple files with same cassette
      console.warn(`[Storage] Found ${matchingFiles.length} files with cassette: ${cassetteSync}`);
      console.warn(`[Storage] File locations:`, matchingFiles.map(f => f.path));
      
      const selectedFile = selectDeterministicFile(plugin, matchingFiles);
      const existingContent = await vault.read(selectedFile);
      const content = generateMarkdownWithCassetteSync(plugin, item, config, cassetteSync, existingContent);
      
      await vault.modify(selectedFile, content);
      
      return {
        action: 'duplicates-detected',
        filePath: selectedFile.path,
        cassetteSync,
        duplicatePaths: matchingFiles.map(f => f.path),
        message: `Updated ${selectedFile.path} but found ${matchingFiles.length} duplicates across vault`
      };
    }
    
    if (matchingFiles.length === 1) {
      // EXACT MATCH: Update existing file (regardless of location or filename)
      const file = matchingFiles[0];
      debug.log(`[Storage] Updating existing file: ${file.path}`);
      debug.log(`[Storage] File location: ${file.parent?.path || 'root'}`);
      debug.log(`[Storage] Filename: ${file.name}`);
      debug.log(`[Storage] ✓ Sync based on cassette, NOT filename`);
      
      const existingContent = await vault.read(file);
      const content = generateMarkdownWithCassetteSync(plugin, item, config, cassetteSync, existingContent);
      
      await vault.modify(file, content);
      
      return {
        action: 'updated',
        filePath: file.path,
        cassetteSync,
        message: `Updated ${file.path} (filename-independent sync)`
      };
    }
    
    // STEP 2: No cassette match - try legacy file detection
    // Note: Legacy detection only looks in target folder since old files wouldn't have been moved
    debug.log(`[Storage] No cassette match in entire vault, attempting legacy file detection in ${folderPath}...`);
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
    
    // Check for filename collision and generate unique name if needed
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
    
  } finally {
    // Always release lock
    releaseSyncLock(cassetteSync);
  }
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
        new Notice(`⚠️ Duplicates found: ${item.title}`, 3000);
      } else if (result.action === 'linked-legacy') {
        debug.log(`[Storage] ${result.message}`);
      }
    } catch (error) {
      console.error(`[Storage] Failed to save ${item.title}:`, error);
      new Notice(`❌ Failed to save: ${item.title}`, 3000);
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
