/**
 * Cassette Sync Manager
 * 
 * Handles cassette identifier generation, validation, file lookup,
 * and concurrency control through in-memory locks.
 * 
 * PERFORMANCE: Now uses indexed lookups instead of vault-wide scans
 */

import { TFile } from 'obsidian';
import type CassettePlugin from '../../main';
import type { UniversalMediaItem } from '../../transformers';
import { createDebugLogger } from '../../utils';

/**
 * Validates cassette format: provider:category:id
 * Example: mal:anime:1245
 */
export function validateCassetteSyncFormat(cassetteSync: string): boolean {
  const pattern = /^[a-z0-9_-]+:[a-z0-9_-]+:[A-Za-z0-9_-]+$/;
  return pattern.test(cassetteSync);
}

/**
 * Generates cassette identifier from media item
 * Format: provider:category:id (e.g., mal:anime:1245)
 */
export function generateCassetteSync(item: UniversalMediaItem): string {
  const provider = item.platform.toLowerCase();
  const category = item.category.toLowerCase();
  const id = String(item.id);
  
  const cassetteSync = `${provider}:${category}:${id}`;
  
  // Validate format
  if (!validateCassetteSyncFormat(cassetteSync)) {
    throw new Error(`Invalid cassette format generated: ${cassetteSync}`);
  }
  
  return cassetteSync;
}

/**
 * Finds files by cassette frontmatter property using indexed lookup
 * 
 * PERFORMANCE IMPROVEMENT: O(1) index lookup instead of O(n) vault scan
 * 
 * @param plugin Plugin instance with cassette index
 * @param cassetteSync Cassette identifier to search for
 * @param folderPath Folder path (kept for API compatibility but not used)
 * @returns Array of files with matching cassette
 */
export async function findFilesByCassetteSync(
  plugin: CassettePlugin,
  cassetteSync: string,
  folderPath: string
): Promise<TFile[]> {
  const debug = createDebugLogger(plugin, 'CassetteSync');
  
  // Use indexed lookup if available
  if (plugin.cassetteIndex) {
    const files = plugin.cassetteIndex.findFilesByCassette(cassetteSync);
    
    if (files.length > 0) {
      debug.log(`[CassetteSync] Found ${files.length} file(s) via index: ${cassetteSync}`);
    }
    
    return files;
  }
  
  // Fallback to old method if index not available (shouldn't happen)
  debug.log('[CassetteSync] WARNING: Index not available, falling back to vault scan');
  return await findFilesByCassetteSyncLegacy(plugin, cassetteSync);
}

/**
 * Legacy fallback method for finding files (only used if index unavailable)
 * Kept for safety but should rarely be called
 */
async function findFilesByCassetteSyncLegacy(
  plugin: CassettePlugin,
  cassetteSync: string
): Promise<TFile[]> {
  const debug = createDebugLogger(plugin, 'CassetteSync');
  const { vault, metadataCache } = plugin.app;
  const matchingFiles: TFile[] = [];
  
  const allFiles = vault.getMarkdownFiles();
  
  for (const file of allFiles) {
    const cache = metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    
    if (frontmatter && frontmatter.cassette === cassetteSync) {
      matchingFiles.push(file);
      debug.log(`[CassetteSync] Found file by cassette (legacy): ${file.path}`);
    }
  }
  
  return matchingFiles;
}

/**
 * Attempts to find legacy files that might match this item
 * Uses heuristics: provider-specific ID fields, filename patterns
 * 
 * OPTIMIZATION: Limited to folderPath scope to avoid full vault scan
 * Only called when no cassette match exists (fallback path)
 */
export async function findLegacyFiles(
  plugin: CassettePlugin,
  item: UniversalMediaItem,
  folderPath: string
): Promise<TFile[]> {
  const debug = createDebugLogger(plugin, 'CassetteSync');
  const { vault, metadataCache } = plugin.app;
  const candidates: TFile[] = [];
  
  // OPTIMIZATION: Only scan files in the target folder, not entire vault
  const allFiles = vault.getMarkdownFiles();
  const folderFiles = allFiles.filter(file => file.path.startsWith(folderPath));
  
  debug.log(`[CassetteSync] Legacy detection scanning ${folderFiles.length} files in ${folderPath}`);
  
  // Strategy 1: Check frontmatter for provider-specific ID fields
  for (const file of folderFiles) {
    const cache = metadataCache.getFileCache(file);
    const frontmatter = cache?.frontmatter;
    
    if (!frontmatter) continue;
    
    // Skip files that already have cassette (not legacy)
    if (frontmatter.cassette) continue;
    
    // Check for various ID field patterns
    const idFields = ['malId', 'id', 'providerId', 'external_id'];
    for (const field of idFields) {
      if (frontmatter[field] === item.id || frontmatter[field] === String(item.id)) {
        candidates.push(file);
        debug.log(`[CassetteSync] Legacy candidate found by ${field}: ${file.path}`);
        break;
      }
    }
  }
  
  // Strategy 2: Check filename patterns like provider-id or provider-id-*
  const provider = item.platform.toLowerCase();
  const idStr = String(item.id);
  const filenamePatterns = [
    new RegExp(`^${provider}-${idStr}\\.md$`),
    new RegExp(`^${provider}-${idStr}-.*\\.md$`),
  ];
  
  for (const file of folderFiles) {
    const filename = file.name;
    
    // Skip if already identified
    if (candidates.includes(file)) continue;
    
    // Skip files that already have cassette
    const cache = metadataCache.getFileCache(file);
    if (cache?.frontmatter?.cassette) continue;
    
    if (filenamePatterns.some(pattern => pattern.test(filename))) {
      candidates.push(file);
      debug.log(`[CassetteSync] Legacy candidate found by filename pattern: ${file.path}`);
    }
  }
  
  return candidates;
}

/**
 * Selects deterministic file from duplicates or candidates
 * Uses most recent modification time as tiebreaker
 */
export function selectDeterministicFile(plugin: CassettePlugin, files: TFile[]): TFile {  
  const debug = createDebugLogger(plugin, 'CassetteSync');
  
  if (files.length === 0) {
    throw new Error('No files provided for selection');
  }
  
  // Sort by mtime descending (most recent first)
  const sorted = [...files].sort((a, b) => b.stat.mtime - a.stat.mtime);
  
  debug.log(`[CassetteSync] Selected file from ${files.length} candidates: ${sorted[0].path} (most recent)`);
  return sorted[0];
}
