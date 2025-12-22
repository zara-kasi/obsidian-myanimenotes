/**
 * MyAnimeNotes Sync Manager
 * 
 * Handles myanimenotes identifier generation, validation, and file lookup.
 * 
 * DESIGN: All file lookups use a pre-built index Map passed in.
 * No background indexing, no classes, just simple functions.
 */

import { TFile } from 'obsidian';
import type MyAnimeNotesPlugin from '../../main';
import type { UniversalMediaItem } from '../../transformers';
import type { MyAnimeNotesIndex } from './myanimenotes-index';
import { getFilesFromIndex } from './myanimenotes-index';
import { createDebugLogger } from '../../utils';

/**
 * Validates myanimenotes format: provider:category:id
 * 
 * Format: mal:anime:1245 or mal:manga:2
 * 
 * Rules:
 * - Provider: "mal" (MyAnimeList)
 * - Category: "anime" or "manga"
 * - ID: Positive integer (1-9 followed by 0-9, no leading zeros)
 * 
 * Research confirms MAL IDs are strictly positive integers with no special characters.
 */
export function validateMyAnimeNotesSyncFormat(myanimenotesSync: string): boolean {
  const pattern = /^mal:(anime|manga):[1-9][0-9]*$/;
  return pattern.test(myanimenotesSync);
}

/**
 * Generates myanimenotes identifier from media item
 * Format: provider:category:id (e.g., mal:anime:1245)
 */
export function generateMyAnimeNotesSync(item: UniversalMediaItem): string {
  const provider = item.platform.toLowerCase();
  const category = item.category.toLowerCase();
  const id = String(item.id);
  
  const myanimenotesSync = `${provider}:${category}:${id}`;
  
  // Validate format
  if (!validateMyAnimeNotesSyncFormat(myanimenotesSync)) {
    throw new Error(`Invalid myanimenotes format generated: ${myanimenotesSync}`);
  }
  
  return myanimenotesSync;
}

/**
 * Finds files by myanimenotes using the index
 * 
 * @param index Pre-built index Map
 * @param myanimenotesSync MyAnimeNotes identifier to search for
 * @returns Array of files with matching myanimenotes
 */
export function findFilesByMyAnimeNotesSync(
  index: MyAnimeNotesIndex,
  myanimenotesSync: string
): TFile[] {
  return getFilesFromIndex(index, myanimenotesSync);
}

/**
 * Selects deterministic file from duplicates
 * Uses most recent modification time as tiebreaker
 */
export function selectDeterministicFile(plugin: MyAnimeNotesPlugin, files: TFile[]): TFile {  
  const debug = createDebugLogger(plugin, 'MyAnimeNotesSync');
  
  if (files.length === 0) {
    throw new Error('No files provided for selection');
  }
  
  // Sort by mtime descending (most recent first)
  const sorted = [...files].sort((a, b) => b.stat.mtime - a.stat.mtime);
  
  debug.log(`[MyAnimeNotesSync] Selected file from ${files.length} candidates: ${sorted[0].path} (most recent)`);
  return sorted[0];
}