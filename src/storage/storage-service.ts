/**
 * Storage Service - Template System Only
 * 
 * All configuration comes from templates
 * No more StorageConfig or PropertyMapping
 */

import type CassettePlugin from '../main';
import type { UniversalMediaItem } from '../models';
import { getFolderPath } from './markdown';
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
import type { TFile, MetadataCache } from 'obsidian';
import { normalizePath } from 'obsidian';

// ============================================================================
// TYPES
// ============================================================================

export interface SyncActionResult {
  action: 'created' | 'updated' | 'linked-legacy' | 'duplicates-detected' | 'skipped';
  filePath: string;
  cassetteSync: string;
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
 */
interface BatchItem {
  item: UniversalMediaItem;
  cassetteSync: string;
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

function yieldToUI(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function getSyncedTimestampFast(cache: any | undefined): string | undefined {
  if (cache?.frontmatter?.synced) {
    return cache.frontmatter.synced;
  }
  return undefined;
}

function shouldSkipByTimestamp(
  localSynced: string | undefined,
  remoteSynced: string | undefined,
  forceSync: boolean
): SkipCheckResult {
  if (forceSync) {
    return { skip: false, reason: 'force sync enabled' };
  }
  
  if (!localSynced) {
    return { skip: false, reason: 'no local timestamp' };
  }
  
  if (!remoteSynced) {
    return { skip: false, reason: 'no remote timestamp' };
  }
  
  const localTime = new Date(localSynced).getTime();
  const remoteTime = new Date(remoteSynced).getTime();
  
  if (isNaN(localTime) || isNaN(remoteTime)) {
    return { skip: false, reason: 'invalid timestamp format' };
  }
  
  if (localTime === remoteTime) {
    return { skip: true, reason: 'timestamps match' };
  }
  
  return { skip: false, reason: 'timestamps differ' };
}

// ============================================================================
// BATCH PREPARATION
// ============================================================================

async function prepareBatchItems(
  plugin: CassettePlugin,
  items: UniversalMediaItem[],
  folderPath: string
): Promise<BatchItem[]> {
  const debug = createDebugLogger(plugin, 'Storage');
  const { metadataCache } = plugin.app;
  const startTime = Date.now();
  
  const batchItems: BatchItem[] = [];
  
  debug.log(`[Storage] Batch prep: Reading cache for ${items.length} items...`);
  
  for (const item of items) {
    const cassette = generateCassetteSync(item);
    const lookup = await lookupExistingFiles(plugin, cassette, item, folderPath);
    
    let cachedTimestamp: string | undefined;
    if (lookup.files.length > 0) {
      const file = lookup.files[0];
      const cache = metadataCache.getFileCache(file);
      cachedTimestamp = getSyncedTimestampFast(cache);
    }
    
    batchItems.push({
      item,
      cassetteSync: cassette,
      cachedTimestamp,
      lookup,
      shouldSkip: false,
      skipReason: undefined
    });
  }
  
  debug.log(`[Storage] Batch prep: Computing skip decisions...`);
  
  for (const batch of batchItems) {
    const skipResult = shouldSkipByTimestamp(
      batch.cachedTimestamp,
      batch.item.syncedAt,
      plugin.settings.forceFullSync
    );
    
    batch.shouldSkip = skipResult.skip;
    batch.skipReason = skipResult.reason;
  }
  
  const skipCount = batchItems.filter(b => b.shouldSkip).length;
  const processCount = batchItems.length - skipCount;
  
  debug.log(
    `[Storage] Batch prep complete: ${skipCount} skip, ${processCount} process (${Date.now() - startTime}ms)`
  );
  
  return batchItems;
}

function createSkipResults(skippedItems: BatchItem[]): SyncActionResult[] {
  return skippedItems.map(batch => ({
    action: 'skipped',
    filePath: batch.lookup.files[0]?.path || '',
    cassetteSync: batch.cassetteSync,
    message: `Skipped - ${batch.skipReason}`
  }));
}

// ============================================================================
// FILE LOOKUP
// ============================================================================

async function lookupExistingFiles(
  plugin: CassettePlugin,
  cassetteSync: string,
  item: UniversalMediaItem,
  folderPath: string
): Promise<FileLookupResult> {
  const matchingFiles = await findFilesByCassetteSync(plugin, cassetteSync, folderPath);
  
  if (matchingFiles.length > 1) {
    return { type: 'duplicates', files: matchingFiles };
  }
  
  if (matchingFiles.length === 1) {
    return { type: 'exact', files: matchingFiles };
  }
  
  const legacyCandidates = await findLegacyFiles(plugin, item, folderPath);
  
  if (legacyCandidates.length > 0) {
    return { type: 'legacy', files: legacyCandidates };
  }
  
  return { type: 'none', files: [] };
}

// ============================================================================
// FILE HANDLERS
// ============================================================================

async function handleExactMatch(
  plugin: CassettePlugin,
  file: TFile,
  item: UniversalMediaItem,
  cassetteSync: string
): Promise<SyncActionResult> {
  const frontmatterProps = generateFrontmatterProperties(plugin, item, cassetteSync);
  await updateMarkdownFileFrontmatter(plugin, file, frontmatterProps);
  
  return {
    action: 'updated',
    filePath: file.path,
    cassetteSync,
    message: `Updated ${file.path}`
  };
}

async function handleDuplicates(
  plugin: CassettePlugin,
  files: TFile[],
  item: UniversalMediaItem,
  cassetteSync: string
): Promise<SyncActionResult> {
  console.warn(`[Storage] Found ${files.length} files with cassette: ${cassetteSync}`);
  const selectedFile = selectDeterministicFile(plugin, files);
  
  const frontmatterProps = generateFrontmatterProperties(plugin, item, cassetteSync);
  await updateMarkdownFileFrontmatter(plugin, selectedFile, frontmatterProps);
  
  return {
    action: 'duplicates-detected',
    filePath: selectedFile.path,
    cassetteSync,
    duplicatePaths: files.map(f => f.path),
    message: `Updated ${selectedFile.path} but found ${files.length} duplicates`
  };
}

async function handleLegacyMigration(
  plugin: CassettePlugin,
  files: TFile[],
  item: UniversalMediaItem,
  cassetteSync: string
): Promise<SyncActionResult> {
  if (files.length > 1) {
    console.warn(`[Storage] Found ${files.length} legacy candidates for ${cassetteSync}`);
  }
  
  const selectedFile = selectDeterministicFile(plugin, files);
  const frontmatterProps = generateFrontmatterProperties(plugin, item, cassetteSync);
  await updateMarkdownFileFrontmatter(plugin, selectedFile, frontmatterProps);
  
  return {
    action: 'linked-legacy',
    filePath: selectedFile.path,
    cassetteSync,
    duplicatePaths: files.length > 1 ? files.map(f => f.path) : undefined,
    message: `Migrated legacy file ${selectedFile.path}`
  };
}

async function createNewFile(
  plugin: CassettePlugin,
  item: UniversalMediaItem,
  cassetteSync: string,
  folderPath: string
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  const { vault } = plugin.app;
  
  const sanitizedTitle = item.title
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  
  const frontmatterProps = generateFrontmatterProperties(plugin, item, cassetteSync);
  
  const MAX_ATTEMPTS = 5;
  const normalizedFolderPath = normalizePath(folderPath);
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const filename = attempt === 1 
      ? `${sanitizedTitle}.md`
      : generateUniqueFilename(plugin, vault, normalizedFolderPath, `${sanitizedTitle}.md`);
    
    const filePath = normalizePath(`${normalizedFolderPath}/${filename}`);
    
    try {
      const initialContent = '---\n---\n';
      const createdFile = await vault.create(filePath, initialContent);
      await updateMarkdownFileFrontmatter(plugin, createdFile, frontmatterProps);
      
      debug.log(`[Storage] Created: ${filePath}`);
      
      return {
        action: 'created',
        filePath: createdFile.path,
        cassetteSync,
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
  
  throw new Error(`Failed to create file for ${cassetteSync}`);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Saves a single media item
 * Uses template configuration automatically
 */
export async function saveMediaItem(
  plugin: CassettePlugin,
  item: UniversalMediaItem
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  const cassetteSync = generateCassetteSync(item);
  
  debug.log(`[Storage] Saving item: ${cassetteSync}`);
  
  if (!plugin.lockManager) {
    throw new Error('Lock manager not initialized');
  }
  
  return await plugin.lockManager.withLock(cassetteSync, async () => {
    // Get folder path from template
    let folderPath = getFolderPath(plugin, item.category);
    folderPath = normalizePath(folderPath);
    
    await ensureFolderExists(plugin, folderPath);
    
    const lookup = await lookupExistingFiles(plugin, cassetteSync, item, folderPath);
    
    switch (lookup.type) {
      case 'exact':
        return handleExactMatch(plugin, lookup.files[0], item, cassetteSync);
      case 'duplicates':
        return handleDuplicates(plugin, lookup.files, item, cassetteSync);
      case 'legacy':
        return handleLegacyMigration(plugin, lookup.files, item, cassetteSync);
      case 'none':
        return createNewFile(plugin, item, cassetteSync, folderPath);
      default:
        throw new Error(`Unknown lookup type: ${(lookup as any).type}`);
    }
  });
}

/**
 * Saves multiple media items (batch operation)
 * Uses template configuration automatically
 */
export async function saveMediaItems(
  plugin: CassettePlugin,
  items: UniversalMediaItem[],
  progressCallback?: ProgressCallback
): Promise<SyncActionResult[]> {
  const debug = createDebugLogger(plugin, 'Storage');
  const startTime = Date.now();
  
  if (items.length === 0) {
    return [];
  }
  
  debug.log(`[Storage] Batch save starting: ${items.length} items`);
  
  // Get folder path from template
  let folderPath = getFolderPath(plugin, items[0].category);
  folderPath = normalizePath(folderPath);
  
  await ensureFolderExists(plugin, folderPath);
  
  const batchItems = await prepareBatchItems(plugin, items, folderPath);
  
  const results: SyncActionResult[] = [];
  const skippedItems = batchItems.filter(b => b.shouldSkip);
  const itemsToProcess = batchItems.filter(b => !b.shouldSkip);
  
  if (skippedItems.length > 0) {
    const skipResults = createSkipResults(skippedItems);
    results.push(...skipResults);
    debug.log(`[Storage] Recorded ${skippedItems.length} skips`);
  }
  
  debug.log(`[Storage] Processing ${itemsToProcess.length} items...`);
  
  for (let i = 0; i < itemsToProcess.length; i++) {
    const batch = itemsToProcess[i];
    
    try {
      let result: SyncActionResult;
      
      switch (batch.lookup.type) {
        case 'exact':
          result = await handleExactMatch(plugin, batch.lookup.files[0], batch.item, batch.cassetteSync);
          break;
        case 'duplicates':
          result = await handleDuplicates(plugin, batch.lookup.files, batch.item, batch.cassetteSync);
          break;
        case 'legacy':
          result = await handleLegacyMigration(plugin, batch.lookup.files, batch.item, batch.cassetteSync);
          break;
        case 'none':
          result = await createNewFile(plugin, batch.item, batch.cassetteSync, folderPath);
          break;
        default:
          throw new Error(`Unknown lookup type: ${(batch.lookup as any).type}`);
      }
      
      results.push(result);
      
      if (progressCallback) {
        progressCallback(i + 1, itemsToProcess.length, batch.item.title);
      }
      
      if ((i + 1) % 10 === 0) {
        await yieldToUI();
      }
      
    } catch (error) {
      console.error(`[Storage] Failed to save ${batch.item.title}:`, error);
    }
  }
  
  const totalDuration = Date.now() - startTime;
  debug.log(`[Storage] Batch save complete: ${results.length} results (${totalDuration}ms)`);
  
  return results;
}

/**
 * Saves media items by category
 * Uses template configuration automatically
 */
export async function saveMediaItemsByCategory(
  plugin: CassettePlugin,
  items: UniversalMediaItem[],
  progressCallback?: ProgressCallback
): Promise<{ anime: string[]; manga: string[] }> {
  const debug = createDebugLogger(plugin, 'Storage');
  const animePaths: string[] = [];
  const mangaPaths: string[] = [];
  
  const animeItems = items.filter(item => item.category === 'anime');
  const mangaItems = items.filter(item => item.category === 'manga');
  
  debug.log(`[Storage] Category split: ${animeItems.length} anime, ${mangaItems.length} manga`);
  
  if (animeItems.length > 0) {
    const results = await saveMediaItems(plugin, animeItems, progressCallback);
    animePaths.push(...results.map(r => r.filePath));
  }
  
  if (mangaItems.length > 0) {
    const results = await saveMediaItems(plugin, mangaItems, progressCallback);
    mangaPaths.push(...results.map(r => r.filePath));
  }
  
  return { anime: animePaths, manga: mangaPaths };
}
