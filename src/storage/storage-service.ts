import type CassettePlugin from '../main';
import type { UniversalMediaItem } from '../models';
import type { PropertyMapping } from './markdown';
import { DEFAULT_PROPERTY_MAPPING } from './markdown';
import { 
  generateCassetteSync, 
  findFilesByCassetteSync, 
  findLegacyFiles, 
  selectDeterministicFile
} from './cassette';
import { ensureFolderExists, generateUniqueFilename } from './file-utils';
import {
  generateFrontmatterProperties,
  updateMarkdownFileFrontmatter
} from './markdown';
import { createDebugLogger } from '../utils';
import type { TFile } from 'obsidian';
import { normalizePath } from 'obsidian';

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
 * Internal lookup result
 */
interface FileLookupResult {
  type: 'exact' | 'duplicates' | 'legacy' | 'none';
  files: TFile[];
}

/**
 * Skip check result
 */
interface SkipCheckResult {
  skip: boolean;
  reason?: string;
}

// ============================================================================
// SKIP LOGIC - OPTIMIZED
// ============================================================================

/**
 * Safely gets the synced timestamp from file metadata
 * Uses cache first, with validation fallback
 * 
 * @returns Synced timestamp or undefined if not found/invalid
 */
async function getSyncedTimestamp(
  plugin: CassettePlugin,
  file: TFile
): Promise<string | undefined> {
  const { metadataCache } = plugin.app;
  
  // Try cache first (fast path - no I/O)
  const cache = metadataCache.getFileCache(file);
  
  if (cache?.frontmatter?.synced) {
    // Validate cache freshness: check if cache has position data
    const hasValidCache = cache.frontmatterPosition?.end.offset !== undefined;
    
    // If cache seems valid, trust it
    if (hasValidCache) {
      return cache.frontmatter.synced;
    }
  }
  
  // Cache miss or potentially stale - this should be rare
  // Wait a moment for cache to update if metadata change just happened
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Try cache again after brief delay
  const freshCache = metadataCache.getFileCache(file);
  if (freshCache?.frontmatter?.synced) {
    return freshCache.frontmatter.synced;
  }
  
  // Fallback: no valid synced timestamp found
  // This means either new file or cache corruption - safer to update
  return undefined;
}

/**
 * Checks if a file should be skipped based on sync timestamps
 * Unified skip logic for all update scenarios
 * 
 * @returns Skip decision with reason for logging
 */
async function shouldSkipFile(
  plugin: CassettePlugin,
  file: TFile,
  item: UniversalMediaItem
): Promise<SkipCheckResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  
  // Force sync always updates
  if (plugin.settings.forceFullSync) {
    debug.log(`[Storage] Force sync enabled - will update ${file.path}`);
    return { skip: false, reason: 'force sync enabled' };
  }
  
  // Get local synced timestamp (cache-first with validation)
  const localSynced = await getSyncedTimestamp(plugin, file);
  
  // No local timestamp means new/legacy file - always update
  if (!localSynced) {
    debug.log(`[Storage] No synced timestamp in ${file.path} - will update`);
    return { skip: false, reason: 'no local timestamp' };
  }
  
  // No remote timestamp means API didn't provide it - always update to be safe
  if (!item.syncedAt) {
    debug.log(`[Storage] No remote timestamp from API - will update ${file.path}`);
    return { skip: false, reason: 'no remote timestamp' };
  }
  
  // Compare timestamps
  const localTime = new Date(localSynced).getTime();
  const remoteTime = new Date(item.syncedAt).getTime();
  
  // Invalid timestamps - update to be safe
  if (isNaN(localTime) || isNaN(remoteTime)) {
    debug.log(`[Storage] Invalid timestamp format - will update ${file.path}`);
    return { skip: false, reason: 'invalid timestamp format' };
  }
  
  // Timestamps match - skip!
  if (localTime === remoteTime) {
    debug.log(`[Storage] Timestamps match for ${file.path} - skipping`);
    return { skip: true, reason: 'timestamps match' };
  }
  
  // Timestamps differ - update needed
  debug.log(`[Storage] Timestamps differ for ${file.path} - will update`);
  debug.log(`  Local: ${localSynced} (${localTime})`);
  debug.log(`  Remote: ${item.syncedAt} (${remoteTime})`);
  return { skip: false, reason: 'timestamps differ' };
}

// ============================================================================
// FILE LOOKUP
// ============================================================================

/**
 * Performs file lookup using cassette and legacy strategies
 */
async function lookupExistingFiles(
  plugin: CassettePlugin,
  cassetteSync: string,
  item: UniversalMediaItem,
  folderPath: string
): Promise<FileLookupResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  
  // Strategy 1: Cassette-based lookup (primary)
  const matchingFiles = await findFilesByCassetteSync(plugin, cassetteSync, folderPath);
  
  if (matchingFiles.length > 1) {
    return { type: 'duplicates', files: matchingFiles };
  }
  
  if (matchingFiles.length === 1) {
    return { type: 'exact', files: matchingFiles };
  }
  
  // Strategy 2: Legacy file detection (fallback)
  debug.log(`[Storage] No cassette match, attempting legacy detection in ${folderPath}...`);
  const legacyCandidates = await findLegacyFiles(plugin, item, folderPath);
  
  if (legacyCandidates.length > 0) {
    return { type: 'legacy', files: legacyCandidates };
  }
  
  return { type: 'none', files: [] };
}

// ============================================================================
// FILE HANDLERS
// ============================================================================

/**
 * Handles exact match case (single file found)
 * Uses unified skip check with cache-first optimization
 */
async function handleExactMatch(
  plugin: CassettePlugin,
  file: TFile,
  item: UniversalMediaItem,
  config: StorageConfig,
  cassetteSync: string
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  
  // Unified skip check (cache-first, no file I/O unless needed)
  const skipCheck = await shouldSkipFile(plugin, file, item);
  
  if (skipCheck.skip) {
    return {
      action: 'skipped',
      filePath: file.path,
      cassetteSync,
      message: `Skipped ${file.path} - ${skipCheck.reason}`
    };
  }
  
  // Perform update
  debug.log(`[Storage] Updating ${file.path} - ${skipCheck.reason}`);
  
  const frontmatterProps = generateFrontmatterProperties(plugin, item, config, cassetteSync);
  
  // Update frontmatter using Obsidian's API (preserves body automatically)
  await updateMarkdownFileFrontmatter(plugin, file, frontmatterProps);
  
  return {
    action: 'updated',
    filePath: file.path,
    cassetteSync,
    message: `Updated ${file.path}`
  };
}

/**
 * Handles duplicate files case
 * Uses unified skip check with cache-first optimization
 */
async function handleDuplicates(
  plugin: CassettePlugin,
  files: TFile[],
  item: UniversalMediaItem,
  config: StorageConfig,
  cassetteSync: string
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  
  console.warn(`[Storage] Found ${files.length} files with cassette: ${cassetteSync}`);
  
  const selectedFile = selectDeterministicFile(plugin, files);
  
  // Unified skip check (cache-first, no file I/O unless needed)
  const skipCheck = await shouldSkipFile(plugin, selectedFile, item);
  
  if (skipCheck.skip) {
    return {
      action: 'skipped',
      filePath: selectedFile.path,
      cassetteSync,
      duplicatePaths: files.map(f => f.path),
      message: `Skipped ${selectedFile.path} - ${skipCheck.reason} (but ${files.length} duplicates exist)`
    };
  }
  
  // Perform update
  debug.log(`[Storage] Updating ${selectedFile.path} - ${skipCheck.reason}`);
  
  const frontmatterProps = generateFrontmatterProperties(plugin, item, config, cassetteSync);
  
  // Update frontmatter using Obsidian's API (preserves body automatically)
  await updateMarkdownFileFrontmatter(plugin, selectedFile, frontmatterProps);
  
  return {
    action: 'duplicates-detected',
    filePath: selectedFile.path,
    cassetteSync,
    duplicatePaths: files.map(f => f.path),
    message: `Updated ${selectedFile.path} but found ${files.length} duplicates`
  };
}

/**
 * Handles legacy file migration
 * Adds cassette property to existing files without cassette
 */
async function handleLegacyMigration(
  plugin: CassettePlugin,
  files: TFile[],
  item: UniversalMediaItem,
  config: StorageConfig,
  cassetteSync: string
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  
  if (files.length > 1) {
    console.warn(`[Storage] Found ${files.length} legacy candidates for ${cassetteSync}`);
  }
  
  const selectedFile = selectDeterministicFile(plugin, files);
  debug.log(`[Storage] Migrating legacy file: ${selectedFile.path}`);
  
  const frontmatterProps = generateFrontmatterProperties(plugin, item, config, cassetteSync);
  
  // Update frontmatter using Obsidian's API
  // This adds the cassette property while preserving body content
  await updateMarkdownFileFrontmatter(plugin, selectedFile, frontmatterProps);
  
  return {
    action: 'linked-legacy',
    filePath: selectedFile.path,
    cassetteSync,
    duplicatePaths: files.length > 1 ? files.map(f => f.path) : undefined,
    message: `Migrated legacy file ${selectedFile.path} (added cassette)`
  };
}

/**
 * Creates a new file with automatic retry on collision
 * FIXED: Creates file with minimal valid frontmatter, then uses processFrontMatter
 */
async function createNewFile(
  plugin: CassettePlugin,
  item: UniversalMediaItem,
  config: StorageConfig,
  cassetteSync: string,
  folderPath: string
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  const { vault } = plugin.app;
  
  debug.log(`[Storage] Creating new file for ${cassetteSync}`);
  
  const sanitizedTitle = item.title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  
  const frontmatterProps = generateFrontmatterProperties(plugin, item, config, cassetteSync);
  
  const MAX_ATTEMPTS = 5;
  
  // Normalize folder path once
  const normalizedFolderPath = normalizePath(folderPath);
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const filename = attempt === 1 
      ? `${sanitizedTitle}.md`
      : generateUniqueFilename(plugin, vault, normalizedFolderPath, `${sanitizedTitle}.md`);
    
    // Normalize the full file path
    const filePath = normalizePath(`${normalizedFolderPath}/${filename}`);
    
    try {
      // Create file with minimal valid frontmatter structure
      // This ensures processFrontMatter has something to work with
      const initialContent = '---\n---\n';
      const createdFile = await vault.create(filePath, initialContent);
      
      // Now use processFrontMatter to set properties safely
      // This respects Obsidian's frontmatter handling and updates cache
      await updateMarkdownFileFrontmatter(plugin, createdFile, frontmatterProps);
      
      debug.log(`[Storage] Successfully created: ${filePath}`);
      
      return {
        action: 'created',
        filePath: createdFile.path,
        cassetteSync,
        message: `Created ${createdFile.path}`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isCollision = errorMessage.includes('already exists') || 
                         errorMessage.includes('File already exists');
      
      if (!isCollision || attempt >= MAX_ATTEMPTS) {
        throw new Error(
          isCollision 
            ? `Failed to create file after ${MAX_ATTEMPTS} attempts due to naming conflicts`
            : `Failed to create file: ${errorMessage}`
        );
      }
      
      debug.log(`[Storage] Collision detected on attempt ${attempt}, retrying...`);
    }
  }
  
  throw new Error(`Failed to create file for ${cassetteSync}`);
}

// ============================================================================
// MAIN SAVE FUNCTION
// ============================================================================

/**
 * Main save function - orchestrates all file operations
 * Now uses instance-based lock manager and unified skip logic
 */
export async function saveMediaItem(
  plugin: CassettePlugin,
  item: UniversalMediaItem,
  config: StorageConfig
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  
  const cassetteSync = generateCassetteSync(item);
  debug.log(`[Storage] Processing item with cassette: ${cassetteSync}`);
  
  // Ensure lock manager is available
  if (!plugin.lockManager) {
    throw new Error('Lock manager not initialized');
  }
  
  // Use the instance-based lock manager
  return await plugin.lockManager.withLock(cassetteSync, async () => {
    // Determine target folder and normalize it
    let folderPath = item.category === 'anime' 
      ? config.animeFolder 
      : config.mangaFolder;
    
    // Normalize folder path to handle cross-platform paths and user input variations
    folderPath = normalizePath(folderPath);
    
    if (config.createFolders) {
      await ensureFolderExists(plugin, folderPath);
    }
    
    // Lookup existing files
    const lookup = await lookupExistingFiles(plugin, cassetteSync, item, folderPath);
    
    // Handle based on lookup result
    switch (lookup.type) {
      case 'exact':
        return handleExactMatch(plugin, lookup.files[0], item, config, cassetteSync);
      
      case 'duplicates':
        return handleDuplicates(plugin, lookup.files, item, config, cassetteSync);
      
      case 'legacy':
        return handleLegacyMigration(plugin, lookup.files, item, config, cassetteSync);
      
      case 'none':
        return createNewFile(plugin, item, config, cassetteSync, folderPath);
      
      default:
        throw new Error(`Unknown lookup type: ${(lookup as any).type}`);
    }
  });
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Saves multiple media items
 * Processes items sequentially to respect locks
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
 * Useful for getting separate anime/manga file paths
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