// Main service for syncing MAL data

import { Notice } from 'obsidian';
import type CassettePlugin from '../../main';
import type { UniversalMediaItem, SyncResult, SyncItemResult } from '../types';
import { MediaCategory } from '../types';
import {
  fetchCompleteMALAnimeList,
  fetchCompleteMALMangaList,
  fetchMALAnimeByStatus,
  fetchMALMangaByStatus,
} from './mal-api-service';
import {
  transformMALAnimeList,
  transformMALMangaList,
} from '../transformers/mal-transformer';
import { isAuthenticated } from '../../auth/mal';
import { createDebugLogger } from '../utils/debug';

/**
 * Sync options
 */
export interface MALSyncOptions {
  syncAnime?: boolean;
  syncManga?: boolean;
  animeStatuses?: string[];
  mangaStatuses?: string[];
}

/**
 * Default sync options
 */
const DEFAULT_SYNC_OPTIONS: MALSyncOptions = {
  syncAnime: true,
  syncManga: true,
};

/**
 * Syncs anime list from MAL
 * @param plugin Plugin instance
 * @param statuses Optional array of statuses to sync
 * @returns Array of transformed anime items
 */
async function syncAnimeList(
  plugin: CassettePlugin,
  statuses?: string[]
): Promise<UniversalMediaItem[]> {
  const debug = createDebugLogger(plugin, 'MAL Sync');
  
  debug.log('[MAL Sync] Starting anime sync...');
  
  let rawItems: any[] = [];

  if (statuses && statuses.length > 0) {
    // Fetch specific statuses
    for (const status of statuses) {
      const items = await fetchMALAnimeByStatus(
        plugin,
        status as 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch'
      );
      rawItems.push(...items);
    }
  } else {
    // Fetch all anime
    rawItems = await fetchCompleteMALAnimeList(plugin);
  }

  debug.log(`[MAL Sync] Fetched ${rawItems.length} anime items`);
  
  // Transform to universal format
  const transformedItems = transformMALAnimeList(rawItems);
  
  return transformedItems;
}

/**
 * Syncs manga list from MAL
 * @param plugin Plugin instance
 * @param statuses Optional array of statuses to sync
 * @returns Array of transformed manga items
 */
async function syncMangaList(
  plugin: CassettePlugin,
  statuses?: string[]
): Promise<UniversalMediaItem[]> {
  const debug = createDebugLogger(plugin, 'MAL Sync');
  
  debug.log('[MAL Sync] Starting manga sync...');
  
  let rawItems: any[] = [];

  if (statuses && statuses.length > 0) {
    // Fetch specific statuses
    for (const status of statuses) {
      const items = await fetchMALMangaByStatus(
        plugin,
        status as 'reading' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_read'
      );
      rawItems.push(...items);
    }
  } else {
    // Fetch all manga
    rawItems = await fetchCompleteMALMangaList(plugin);
  }

  debug.log(`[MAL Sync] Fetched ${rawItems.length} manga items`);
  
  // Transform to universal format
  const transformedItems = transformMALMangaList(rawItems);
  
  return transformedItems;
}

/**
 * Main sync function for MAL
 * @param plugin Plugin instance
 * @param options Sync options
 * @returns Sync result with all synced items
 */
export async function syncMAL(
  plugin: CassettePlugin,
  options: MALSyncOptions = DEFAULT_SYNC_OPTIONS
): Promise<{ items: UniversalMediaItem[]; result: SyncResult }> {
  const debug = createDebugLogger(plugin, 'MAL Sync');
  const startTime = Date.now();
  const allItems: UniversalMediaItem[] = [];
  const results: SyncItemResult[] = [];
  const errors: string[] = [];
  
  try {
    // Check authentication
    if (!isAuthenticated(plugin)) {
      throw new Error('Not authenticated with MyAnimeList');
    }

    new Notice('Starting MAL sync...', 1000);

    // Sync anime if enabled
    if (options.syncAnime !== false) {
      try {
        const animeItems = await syncAnimeList(plugin, options.animeStatuses);
        allItems.push(...animeItems);
        
        // Create success results for each item
        animeItems.forEach(item => {
          results.push({
            id: item.id,
            title: item.title,
            success: true,
            action: 'updated',
          });
        });
        
        
      } catch (error) {
        const errorMsg = `Failed to sync anime: ${error.message}`;
        console.error('[MAL Sync]', errorMsg);
        errors.push(errorMsg);
        new Notice(`❌ ${errorMsg}`, 5000);
      }
    }

    // Sync manga if enabled
    if (options.syncManga !== false) {
      try {
        const mangaItems = await syncMangaList(plugin, options.mangaStatuses);
        allItems.push(...mangaItems);
        
        // Create success results for each item
        mangaItems.forEach(item => {
          results.push({
            id: item.id,
            title: item.title,
            success: true,
            action: 'updated',
          });
        });
        
        
      } catch (error) {
        const errorMsg = `Failed to sync manga: ${error.message}`;
        console.error('[MAL Sync]', errorMsg);
        errors.push(errorMsg);
        new Notice(`❌ ${errorMsg}`, 5000);
      }
    }

    const endTime = Date.now();
    const syncResult: SyncResult = {
      success: errors.length === 0,
      itemsProcessed: results.length,
      itemsSucceeded: results.filter(r => r.success).length,
      itemsFailed: results.filter(r => !r.success).length,
      results,
      errors,
      startTime,
      endTime,
    };

    if (syncResult.success) {
    } else {
      new Notice(`⚠️ MAL sync completed with ${errors.length} errors`, 4000);
    }

    debug.log('[MAL Sync] Sync completed:', syncResult);
    
    return { items: allItems, result: syncResult };

  } catch (error) {
    const errorMsg = `MAL sync failed: ${error.message}`;
    console.error('[MAL Sync]', errorMsg);
    errors.push(errorMsg);
    
    new Notice(`❌ ${errorMsg}`, 5000);

    const endTime = Date.now();
    const syncResult: SyncResult = {
      success: false,
      itemsProcessed: results.length,
      itemsSucceeded: results.filter(r => r.success).length,
      itemsFailed: results.filter(r => !r.success).length,
      results,
      errors,
      startTime,
      endTime,
    };

    return { items: allItems, result: syncResult };
  }
}

/**
 * Quick sync for specific category
 * @param plugin Plugin instance
 * @param category anime or manga
 * @returns Synced items
 */
export async function quickSyncMAL(
  plugin: CassettePlugin,
  category: MediaCategory
): Promise<UniversalMediaItem[]> {
  const options: MALSyncOptions = {
    syncAnime: category === MediaCategory.ANIME,
    syncManga: category === MediaCategory.MANGA,
  };

  const { items } = await syncMAL(plugin, options);
  return items;
}