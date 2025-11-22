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
import type { TFile } from 'obsidian';

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
 * Checks if timestamps match (sync optimization)
 */
function shouldSkipUpdate(
  localSynced: string | undefined,
  remoteSynced: string | undefined,
  forceSync: boolean
): boolean {
  // Never skip if force sync is enabled
  if (forceSync) return false;
  
  // Skip requires both timestamps
  if (!localSynced || !remoteSynced) return false;
  
  const localDate = new Date(localSynced);
  const remoteDate = new Date(remoteSynced);
  
  const localTime = localDate.getTime();
  const remoteTime = remoteDate.getTime();
  
  // Validate dates
  if (isNaN(localTime) || isNaN(remoteTime)) return false;
  
  return localTime === remoteTime;
}

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

/**
 * Handles updating an existing file
 */
async function updateExistingFile(
  plugin: CassettePlugin,
  file: TFile,
  item: UniversalMediaItem,
  config: StorageConfig,
  cassetteSync: string
): Promise<{ shouldSkip: boolean; content?: string }> {
  const debug = createDebugLogger(plugin, 'Storage');
  const { vault } = plugin.app;
  
  const existingContent = await vault.read(file);
  const parsed = parseExistingFile(existingContent);
  const localSynced = parsed?.frontmatter?.synced;
  
  // Check if we can skip this update
  if (shouldSkipUpdate(localSynced, item.syncedAt, plugin.settings.forceFullSync)) {
    debug.log(`[Storage] Skipping ${file.path} - timestamps match`);
    return { shouldSkip: true };
  }
  
  // Generate updated content
  const content = generateMarkdownWithCassetteSync(
    plugin, 
    item, 
    config, 
    cassetteSync, 
    existingContent
  );
  
  return { shouldSkip: false, content };
}

/**
 * Handles exact match case (single file found)
 */
async function handleExactMatch(
  plugin: CassettePlugin,
  file: TFile,
  item: UniversalMediaItem,
  config: StorageConfig,
  cassetteSync: string
): Promise<SyncActionResult> {
  const { vault } = plugin.app;
  
  const result = await updateExistingFile(plugin, file, item, config, cassetteSync);
  
  if (result.shouldSkip) {
    return {
      action: 'skipped',
      filePath: file.path,
      cassetteSync,
      message: `Skipped ${file.path} - no changes detected`
    };
  }
  
  await vault.process(file, () => result.content!);
  
  return {
    action: 'updated',
    filePath: file.path,
    cassetteSync,
    message: `Updated ${file.path}`
  };
}

/**
 * Handles duplicate files case
 */
async function handleDuplicates(
  plugin: CassettePlugin,
  files: TFile[],
  item: UniversalMediaItem,
  config: StorageConfig,
  cassetteSync: string
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  const { vault } = plugin.app;
  
  console.warn(`[Storage] Found ${files.length} files with cassette: ${cassetteSync}`);
  
  const selectedFile = selectDeterministicFile(plugin, files);
  const result = await updateExistingFile(plugin, selectedFile, item, config, cassetteSync);
  
  if (result.shouldSkip) {
    return {
      action: 'skipped',
      filePath: selectedFile.path,
      cassetteSync,
      message: `Skipped ${selectedFile.path} - no changes (timestamp match)`
    };
  }
  
  await vault.process(selectedFile, () => result.content!);
  
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
 */
async function handleLegacyMigration(
  plugin: CassettePlugin,
  files: TFile[],
  item: UniversalMediaItem,
  config: StorageConfig,
  cassetteSync: string
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  const { vault } = plugin.app;
  
  if (files.length > 1) {
    console.warn(`[Storage] Found ${files.length} legacy candidates for ${cassetteSync}`);
  }
  
  const selectedFile = selectDeterministicFile(plugin, files);
  debug.log(`[Storage] Migrating legacy file: ${selectedFile.path}`);
  
  const existingContent = await vault.read(selectedFile);
  const content = generateMarkdownWithCassetteSync(
    plugin, 
    item, 
    config, 
    cassetteSync, 
    existingContent
  );
  
  await vault.process(selectedFile, () => content);
  
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
  
  const content = generateMarkdownWithCassetteSync(plugin, item, config, cassetteSync);
  
  const MAX_ATTEMPTS = 5;
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const filename = attempt === 1 
      ? `${sanitizedTitle}.md`
      : generateUniqueFilename(plugin, vault, folderPath, `${sanitizedTitle}.md`);
    
    const filePath = `${folderPath}/${filename}`;
    
    try {
      const createdFile = await vault.create(filePath, content);
      debug.log(`[Storage] Successfully created: ${filePath}`);
      
      return {
        action: 'created',
        filePath: createdFile.path,
        cassetteSync,
        message: `Created ${createdFile.path}`
      };
    } catch (error) {
      const isCollision = error.message?.includes('already exists') || 
                         error.message?.includes('File already exists');
      
      if (!isCollision || attempt >= MAX_ATTEMPTS) {
        throw new Error(
          isCollision 
            ? `Failed to create file after ${MAX_ATTEMPTS} attempts due to naming conflicts`
            : `Failed to create file: ${error.message}`
        );
      }
      
      debug.log(`[Storage] Collision detected on attempt ${attempt}, retrying...`);
    }
  }
  
  throw new Error(`Failed to create file for ${cassetteSync}`);
}

/**
 * Main save function - now clean and orchestrates sub-operations
 */
export async function saveMediaItem(
  plugin: CassettePlugin,
  item: UniversalMediaItem,
  config: StorageConfig
): Promise<SyncActionResult> {
  const debug = createDebugLogger(plugin, 'Storage');
  
  const cassetteSync = generateCassetteSync(item);
  debug.log(`[Storage] Processing item with cassette: ${cassetteSync}`);
  
  return await withLock(cassetteSync, async () => {
    // Determine target folder
    const folderPath = item.category === 'anime' 
      ? config.animeFolder 
      : config.mangaFolder;
    
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