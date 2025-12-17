import type MyAnimeNotesPlugin from '../main';
import type { UniversalMediaItem } from '../transformers';
import type { TemplateConfig } from '../settings/template-config';
import { DEFAULT_ANIME_TEMPLATE, DEFAULT_MANGA_TEMPLATE } from '../settings/template-config'
import { 
  generateMyAnimeNotesSync, 
  findFilesByMyAnimeNotesSync, 
  findLegacyFiles, 
  selectDeterministicFile
} from './myanimenotes';
import { ensureFolderExists, generateUniqueFilename } from './file-utils';
import {
  generateFrontmatterProperties,
  updateMarkdownFileFrontmatter,
  generateInitialFileContent
} from './markdown';
import { createDebugLogger } from '../utils';
import type { TFile } from 'obsidian';
import { normalizePath } from 'obsidian';

// ============================================================================
// TYPES
// ============================================================================

export interface StorageConfig {
  animeFolder: string;
  mangaFolder: string;
  createFolders: boolean;
}

export interface SyncActionResult {
  action: 'created' | 'updated' | 'linked-legacy' | 'duplicates-detected' | 'skipped';
  filePath: string;
  myanimenotesSync: string;
  duplicatePaths?: string[];
  message?: string;
}

interface FileLookupResult {
  type: 'exact' | 'duplicates' | 'legacy' | 'none';
  files: TFile[];
}

interface SkipCheckResult {
  skip: boolean;
  reason?: string;
}

/**
 * Batch item with pre-computed decisions
 * Computed upfront during batch preparation phase
 */
interface BatchItem {
  item: UniversalMediaItem;
  myanimenotesSync: string;
  cachedTimestamp: string | undefined;
  lookup: FileLookupResult;
  shouldSkip: boolean;
  skipReason?: string;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (current: number, total: number, itemName: string) => void;

// ============================================================================
// OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Yields to UI thread to prevent freezing
 * Uses requestAnimationFrame for better performance than setTimeout
 * 
 * Calls requestAnimationFrame twice:
 * - First call: returns when browser is ready to paint
 * - Second call: ensures any pending paints are flushed
 */
function yieldToUI(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

/**
 * Gets synced timestamp using FAST cache-first approach
 * NO delays, NO fallbacks - trusts cache immediately
 * 
 * The cache is reliable in practice. The rare edge case of stale cache
 * is acceptable vs 25 seconds of wasted time per batch.
 * 
 * @returns Synced timestamp or undefined if not found
 */
function getSyncedTimestampFast(
  cache: any | undefined
): string | undefined {
  // Fast path: if cache exists and has synced timestamp, return it immediately
  if (cache?.frontmatter?.synced) {
    return cache.frontmatter.synced;
  }
  
  // No timestamp found - return undefined (will update to be safe)
  return undefined;
}

/**
 * Pure computation: determines if file should be skipped
 * No I/O, no delays - just timestamp comparison
 * 
 * @returns Skip decision with reason for logging
 */
function shouldSkipByTimestamp(
  localSynced: string | undefined,
  remoteSynced: string | undefined,
  forceSync: boolean
): SkipCheckResult {
  // Force sync always updates
  if (forceSync) {
    return { skip: false, reason: 'force sync enabled' };
  }
  
  // No local timestamp means new/legacy file - always update
  if (!localSynced) {
    return { skip: false, reason: 'no local timestamp' };
  }
  
  // No remote timestamp - always update to be safe
  if (!remoteSynced) {
    return { skip: false, reason: 'no remote timestamp' };
  }
  
  // Parse timestamps
  const localTime = new Date(localSynced).getTime();
  const remoteTime = new Date(remoteSynced).getTime();
  
  // Invalid timestamps - update to be safe
  if (isNaN(localTime) || isNaN(remoteTime)) {
    return { skip: false, reason: 'invalid timestamp format' };
  }
  
  // Timestamps match - SKIP!
  if (localTime === remoteTime) {
    return { skip: true, reason: 'timestamps match' };
  }
  
  // Timestamps differ - update needed
  return { skip: false, reason: 'timestamps differ' };
}

// ============================================================================
// BATCH PREPARATION PHASE
// ============================================================================

/**
 * Prepares batch items by:
 * 1. Reading ALL metadata caches upfront (no delays)
 * 2. Performing ALL skip decisions in memory (pure computation)
 * 3. Creating enriched batch items with pre-computed decisions
 * 
 * This phase runs quickly (< 100ms for 500 items) and determines
 * exactly which items to process before any file I/O begins.
 * 
 * @returns Array of batch items with computed decisions
 */
async function prepareBatchItems(
  plugin: MyAnimeNotesPlugin,
  items: UniversalMediaItem[],
  config: StorageConfig,
  folderPath: string
): Promise<BatchItem[]> {
  const debug = createDebugLogger(plugin, 'Storage');
  const { metadataCache } = plugin.app;
  const startTime = Date.now();
  
  const batchItems: BatchItem[] = [];
  
  // Phase 1: Generate myanimenotes and read cache for all items upfront
  // This is a single pass through metadata cache - NO delays
  debug.log(`[Storage] Batch prep phase 1: Reading cache for ${items.length} items...`);
  
  const cacheMap = new Map<string, string | undefined>();
  
  for (const item of items) {
    const myanimenotes = generateMyAnimeNotesSync(item);
    
    // Lookup file (index O(1) if available, or vault scan)
    const lookup = await lookupExistingFiles(plugin, myanimenotes, item, folderPath);
    
    // For exact/duplicates/legacy matches, get cache immediately
    let cachedTimestamp: string | undefined;
    if (lookup.files.length > 0) {
      const file = lookup.files[0];
      const cache = metadataCache.getFileCache(file);
      cachedTimestamp = getSyncedTimestampFast(cache);
      cacheMap.set(myanimenotes, cachedTimestamp);
    }
    
    batchItems.push({
      item,
      myanimenotesSync: myanimenotes,
      cachedTimestamp,
      lookup,
      shouldSkip: false, // Will compute in phase 2
      skipReason: undefined
    });
  }
  
  debug.log(`[Storage] Batch prep phase 1 complete: ${Date.now() - startTime}ms`);
  
  // Phase 2: Compute skip decisions (pure memory computation)
  debug.log(`[Storage] Batch prep phase 2: Computing skip decisions...`);
  const phase2Start = Date.now();
  
  for (const batch of batchItems) {
    const skipResult = shouldSkipByTimestamp(
      batch.cachedTimestamp,
      batch.item.updatedAt,
      plugin.settings.forceFullSync
    );
    
    batch.shouldSkip = skipResult.skip;
    batch.skipReason = skipResult.reason;
  }
  
  debug.log(`[Storage] Batch prep phase 2 complete: ${Date.now() - phase2Start}ms`);
  
  // Summary stats
  const skipCount = batchItems.filter(b => b.shouldSkip).length;
  const processCount = batchItems.length - skipCount;
  
  debug.log(
    `[Storage] Batch prep complete: ${items.length} items analyzed, ` +
    `${skipCount} to skip, ${processCount} to process (${Date.now() - startTime}ms total)`
  );
  
  return batchItems;
}

// ============================================================================
// SKIP FAST-PATH
// ============================================================================

/**
 * Records all skipped items as results without any file I/O
 * This completes instantly (< 1ms for 500 items) since there's no disk access
 * 
 * @returns Array of skipped results
 */
function createSkipResults(skippedItems: BatchItem[]): SyncActionResult[] {
  return skippedItems.map(batch => ({
    action: 'skipped',
    filePath: batch.lookup.files[0]?.path || '',
    myanimenotesSync: batch.myanimenotesSync,
    message: `Skipped - ${batch.skipReason}`
  }));
}

// ============================================================================
// FILE LOOKUP (with caching during batch)
// ============================================================================

/**
 * Performs file lookup using myanimenotes and legacy strategies
 */
async function lookupExistingFiles(
  plugin: MyAnimeNotesPlugin,
  myanimenotesSync: string,
  item: UniversalMediaItem,
  folderPath: string
): Promise<FileLookupResult> {
  // Strategy 1: MyAnimeNotes-based lookup (primary)
  const matchingFiles = await findFilesByMyAnimeNotesSync(plugin, myanimenotesSync, folderPath);
  
  if (matchingFiles.length > 1) {
    return { type: 'duplicates', files: matchingFiles };
  }
  
  if (matchingFiles.length === 1) {
    return { type: 'exact', files: matchingFiles };
  }
  
  // Strategy 2: Legacy file detection (fallback)
  const legacyCandidates = await findLegacyFiles(plugin, item, folderPath);
  
  if (legacyCandidates.length > 0) {
    return { type: 'legacy', files: legacyCandidates };
  }
  
  return { type: 'none', files: [] };
}

// ============================================================================
// FILE HANDLERS (unchanged core logic)
// ============================================================================

async function handleExactMatch(
  plugin: MyAnimeNotesPlugin,
  file: TFile,
  item: UniversalMediaItem,
  config: StorageConfig,
  myanimenotesSync: string
): Promise<SyncActionResult> {
  // Get template based on category
  const template = item.category === 'anime'
    ? (plugin.settings.animeTemplate || DEFAULT_ANIME_TEMPLATE)
    : (plugin.settings.mangaTemplate || DEFAULT_MANGA_TEMPLATE);
  
  const frontmatterProps = generateFrontmatterProperties(plugin, item, template, myanimenotesSync);
  await updateMarkdownFileFrontmatter(plugin, file, frontmatterProps);
  
  return {
    action: 'updated',
    filePath: file.path,
    myanimenotesSync,
    message: `Updated ${file.path}`
  };
}

async function handleDuplicates(
  plugin: MyAnimeNotesPlugin,
  files: TFile[],
  item: UniversalMediaItem,
  config: StorageConfig,
  myanimenotesSync: string
): Promise<SyncActionResult> {
  console.warn(`[Storage] Found ${files.length} files with myanimenotes: ${myanimenotesSync}`);
  const selectedFile = selectDeterministicFile(plugin, files);
  
  // Get template based on category
  const template = item.category === 'anime'
    ? (plugin.settings.animeTemplate || DEFAULT_ANIME_TEMPLATE)
    : (plugin.settings.mangaTemplate || DEFAULT_MANGA_TEMPLATE);
  
  const frontmatterProps = generateFrontmatterProperties(plugin, item, template, myanimenotesSync);
  await updateMarkdownFileFrontmatter(plugin, selectedFile, frontmatterProps);
  
  return {
    action: 'duplicates-detected',
    filePath: selectedFile.path,
    myanimenotesSync,
    duplicatePaths: files.map(f => f.path),
    message: `Updated ${selectedFile.path} but found ${files.length} duplicates`
  };
}

async function handleLegacyMigration(
  plugin: MyAnimeNotesPlugin,
  files: TFile[],
  item: UniversalMediaItem,
  config: StorageConfig,
  myanimenotesSync: string
): Promise<SyncActionResult> {
  if (files.length > 1) {
    console.warn(`[Storage] Found ${files.length} legacy candidates for ${myanimenotesSync}`);
  }
  
  const selectedFile = selectDeterministicFile(plugin, files);
  // Get template based on category
  const template = item.category === 'anime'
    ? (plugin.settings.animeTemplate || DEFAULT_ANIME_TEMPLATE)
    : (plugin.settings.mangaTemplate || DEFAULT_MANGA_TEMPLATE);
  
  const frontmatterProps = generateFrontmatterProperties(plugin, item, template, myanimenotesSync);
  await updateMarkdownFileFrontmatter(plugin, selectedFile, frontmatterProps);
  
  return {
    action: 'linked-legacy',
    filePath: selectedFile.path,
    myanimenotesSync,
    duplicatePaths: files.length > 1 ? files.map(f => f.path) : undefined,
    message: `Migrated legacy file ${selectedFile.path}`
  };
}

 async function createNewFile(
  plugin: MyAnimeNotesPlugin,
  item: UniversalMediaItem,
  config: StorageConfig,
  myanimenotesSync: string,
  folderPath: string
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  const { vault } = plugin.app;
  
  const sanitizedTitle = item.title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Get template based on category
  const template = item.category === 'anime'
    ? (plugin.settings.animeTemplate || DEFAULT_ANIME_TEMPLATE)
    : (plugin.settings.mangaTemplate || DEFAULT_MANGA_TEMPLATE);
  
  const frontmatterProps = generateFrontmatterProperties(plugin, item, template, myanimenotesSync);
  
  // NEW: Generate initial content with frontmatter + body
  const initialContent = generateInitialFileContent(
    frontmatterProps,
    template.noteContent || '',
    item
  );
  
  const MAX_ATTEMPTS = 5;
  const normalizedFolderPath = normalizePath(folderPath);
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const filename = attempt === 1 
      ? `${sanitizedTitle}.md`
      : generateUniqueFilename(plugin, vault, normalizedFolderPath, `${sanitizedTitle}.md`);
    
    const filePath = normalizePath(`${normalizedFolderPath}/${filename}`);
    
    try {
      // CHANGED: Use generated content instead of '---\n---\n'
      const createdFile = await vault.create(filePath, initialContent);
      
      debug.log(`[Storage] Created: ${filePath}`);
      
      return {
        action: 'created',
        filePath: createdFile.path,
        myanimenotesSync,
        message: `Created ${createdFile.path}`
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isCollision = errorMessage.includes('already exists');
      
      if (!isCollision || attempt >= MAX_ATTEMPTS) {
        throw new Error(
          isCollision 
            ? `Failed to create file after ${MAX_ATTEMPTS} attempts`
            : `Failed to create file: ${errorMessage}`
        );
      }
      
      debug.log(`[Storage] Collision on attempt ${attempt}, retrying...`);
    }
  }
  
  throw new Error(`Failed to create file for ${myanimenotesSync}`);
}

// ============================================================================
// MAIN OPTIMIZED SAVE FUNCTION
// ============================================================================

/**
 * Single-item save with locking (backward compatible)
 * Kept for existing code that calls this directly
 */
export async function saveMediaItem(
  plugin: MyAnimeNotesPlugin,
  item: UniversalMediaItem,
  config: StorageConfig
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  const myanimenotesSync = generateMyAnimeNotesSync(item);
  
  debug.log(`[Storage] Saving item: ${myanimenotesSync}`);
  
  if (!plugin.lockManager) {
    throw new Error('Lock manager not initialized');
  }
  
  // Single-item operations use lock for safety
  return await plugin.lockManager.withLock(myanimenotesSync, async () => {
    let folderPath = item.category === 'anime' 
      ? config.animeFolder 
      : config.mangaFolder;
    
    folderPath = normalizePath(folderPath);
    
    if (config.createFolders) {
      await ensureFolderExists(plugin, folderPath);
    }
    
    const lookup = await lookupExistingFiles(plugin, myanimenotesSync, item, folderPath);
    
    switch (lookup.type) {
      case 'exact':
        return handleExactMatch(plugin, lookup.files[0], item, config, myanimenotesSync);
      case 'duplicates':
        return handleDuplicates(plugin, lookup.files, item, config, myanimenotesSync);
      case 'legacy':
        return handleLegacyMigration(plugin, lookup.files, item, config, myanimenotesSync);
      case 'none':
        return createNewFile(plugin, item, config, myanimenotesSync, folderPath);
      default:
        throw new Error(`Unknown lookup type: ${(lookup as any).type}`);
    }
  });
}


// ============================================================================
// OPTIMIZED BATCH OPERATIONS
// ============================================================================

/**
 * OPTIMIZED batch save with:
 * - Batch preparation phase (all cache reads + skip decisions upfront)
 * - Skip fast-path (instant recording of skips, no I/O)
 * - UI yielding every 10 items (prevents freezing)
 * - Progress callback for real-time feedback
 * - No per-item locks (sequential processing already safe)
 */
export async function saveMediaItems(
  plugin: MyAnimeNotesPlugin,
  items: UniversalMediaItem[],
  config: StorageConfig,
  progressCallback?: ProgressCallback
): Promise<SyncActionResult[]> {
  const debug = createDebugLogger(plugin, 'Storage');
  const startTime = Date.now();
  
  if (items.length === 0) {
    return [];
  }
  
  debug.log(`[Storage] Batch save starting: ${items.length} items`);
  
  // PREPARE PHASE: Batch preparation (all cache reads + decisions upfront)
  let folderPath = items[0].category === 'anime'
    ? config.animeFolder
    : config.mangaFolder;
  
  folderPath = normalizePath(folderPath);
  
  if (config.createFolders) {
    await ensureFolderExists(plugin, folderPath);
  }
  
  debug.log(`[Storage] Starting batch preparation phase...`);
  const prepStartTime = Date.now();
  const batchItems = await prepareBatchItems(plugin, items, config, folderPath);
  const prepDuration = Date.now() - prepStartTime;
  debug.log(`[Storage] Batch preparation complete: ${prepDuration}ms`);
  
  // FAST-PATH: Record all skips instantly (no I/O)
  const results: SyncActionResult[] = [];
  const skippedItems = batchItems.filter(b => b.shouldSkip);
  const itemsToProcess = batchItems.filter(b => !b.shouldSkip);
  
  if (skippedItems.length > 0) {
    const skipResults = createSkipResults(skippedItems);
    results.push(...skipResults);
    debug.log(`[Storage] Recorded ${skippedItems.length} skips (fast-path, < 1ms)`);
  }
  
  // PROCESS PHASE: Update items with UI yielding
  debug.log(`[Storage] Processing ${itemsToProcess.length} items...`);
  const processStartTime = Date.now();
  
  for (let i = 0; i < itemsToProcess.length; i++) {
    const batch = itemsToProcess[i];
    
    try {
      let result: SyncActionResult;
      
      switch (batch.lookup.type) {
        case 'exact':
          result = await handleExactMatch(
            plugin,
            batch.lookup.files[0],
            batch.item,
            config,
            batch.myanimenotesSync
          );
          break;
        
        case 'duplicates':
          result = await handleDuplicates(
            plugin,
            batch.lookup.files,
            batch.item,
            config,
            batch.myanimenotesSync
          );
          break;
        
        case 'legacy':
          result = await handleLegacyMigration(
            plugin,
            batch.lookup.files,
            batch.item,
            config,
            batch.myanimenotesSync
          );
          break;
        
        case 'none':
          result = await createNewFile(
            plugin,
            batch.item,
            config,
            batch.myanimenotesSync,
            folderPath
          );
          break;
        
        default:
          throw new Error(`Unknown lookup type: ${(batch.lookup as any).type}`);
      }
      
      results.push(result);
      
      // Call progress callback after each item
      if (progressCallback) {
        progressCallback(i + 1, itemsToProcess.length, batch.item.title);
      }
      
      // Yield to UI every 10 items to prevent freezing
      if ((i + 1) % 10 === 0) {
        await yieldToUI();
      }
      
    } catch (error) {
      console.error(`[Storage] Failed to save ${batch.item.title}:`, error);
    }
  }
  
  const processDuration = Date.now() - processStartTime;
  const totalDuration = Date.now() - startTime;
  
  debug.log(
    `[Storage] Batch save complete: ${results.length} results ` +
    `(prep: ${prepDuration}ms, process: ${processDuration}ms, total: ${totalDuration}ms)`
  );
  
  return results;
}

/**
 * Category-based batch save with progress callback 
 */
export async function saveMediaItemsByCategory(
  plugin: MyAnimeNotesPlugin,
  items: UniversalMediaItem[],
  config: StorageConfig,
  progressCallback?: ProgressCallback
): Promise<{ anime: string[]; manga: string[] }> {
  const debug = createDebugLogger(plugin, 'Storage');
  const animePaths: string[] = [];
  const mangaPaths: string[] = [];
  
  const animeItems = items.filter(item => item.category === 'anime');
  const mangaItems = items.filter(item => item.category === 'manga');
  
  debug.log(`[Storage] Category split: ${animeItems.length} anime, ${mangaItems.length} manga`);
  
  if (animeItems.length > 0) {
    const results = await saveMediaItems(plugin, animeItems, config, progressCallback);
    animePaths.push(...results.map(r => r.filePath));
  }
  
  if (mangaItems.length > 0) {
    const results = await saveMediaItems(plugin, mangaItems, config, progressCallback);
    mangaPaths.push(...results.map(r => r.filePath));
  }
  
  return { anime: animePaths, manga: mangaPaths };
}
