// src/sync/sync-manager.ts
// Main orchestrator for sync operations

import { Notice } from 'obsidian';
import type CassettePlugin from '../main';
import type { UniversalMediaItem, SyncResult, MediaCategory } from './types';
import { syncMAL, quickSyncMAL, type MALSyncOptions } from './services/mal-sync-service';
import { saveMediaItemsByCategory, type StorageConfig } from './storage/storage-service';

/**
 * Complete sync options
 */
export interface CompleteSyncOptions extends MALSyncOptions {
  saveToVault?: boolean;
  storageConfig?: StorageConfig;
}

/**
 * Sync manager class
 */
export class SyncManager {
  constructor(private plugin: CassettePlugin) {}

  /**
   * Performs a complete sync from MAL
   * @param options Sync options
   * @returns Synced items and result
   */
  async syncFromMAL(options: CompleteSyncOptions = {}): Promise<{
    items: UniversalMediaItem[];
    result: SyncResult;
    savedPaths?: { anime: string[]; manga: string[] };
  }> {
    console.log('[Sync Manager] Starting MAL sync...', options);
    
    try {
      // Perform sync
      const { items, result } = await syncMAL(this.plugin, options);
      
      // Save to vault if enabled
      let savedPaths: { anime: string[]; manga: string[] } | undefined;
      
      if (options.saveToVault !== false && items.length > 0) {
        try {
          savedPaths = await saveMediaItemsByCategory(
            this.plugin,
            items,
            options.storageConfig
          );
          
          console.log('[Sync Manager] Saved to vault:', savedPaths);
        } catch (saveError) {
          console.error('[Sync Manager] Failed to save to vault:', saveError);
          new Notice(`⚠️ Synced but failed to save: ${saveError.message}`, 5000);
        }
      }
      
      return { items, result, savedPaths };
      
    } catch (error) {
      console.error('[Sync Manager] Sync failed:', error);
      throw error;
    }
  }

  /**
   * Quick sync for a specific category
   * @param category anime or manga
   * @param saveToVault Whether to save to vault
   * @returns Synced items
   */
  async quickSync(
    category: MediaCategory,
    saveToVault: boolean = true
  ): Promise<UniversalMediaItem[]> {
    console.log(`[Sync Manager] Quick sync for ${category}...`);
    
    const items = await quickSyncMAL(this.plugin, category);
    
    if (saveToVault && items.length > 0) {
      await saveMediaItemsByCategory(this.plugin, items);
    }
    
    return items;
  }

  /**
   * Syncs only anime
   * @param saveToVault Whether to save to vault
   * @returns Synced anime items
   */
  async syncAnime(saveToVault: boolean = true): Promise<UniversalMediaItem[]> {
    return this.quickSync('anime', saveToVault);
  }

  /**
   * Syncs only manga
   * @param saveToVault Whether to save to vault
   * @returns Synced manga items
   */
  async syncManga(saveToVault: boolean = true): Promise<UniversalMediaItem[]> {
    return this.quickSync('manga', saveToVault);
  }

  /**
   * Syncs items with specific status
   * @param category anime or manga
   * @param status Status to sync
   * @param saveToVault Whether to save to vault
   * @returns Synced items
   */
  async syncByStatus(
    category: MediaCategory,
    status: string,
    saveToVault: boolean = true
  ): Promise<UniversalMediaItem[]> {
    console.log(`[Sync Manager] Syncing ${category} with status ${status}...`);
    
    const options: CompleteSyncOptions = {
      syncAnime: category === 'anime',
      syncManga: category === 'manga',
      saveToVault,
    };
    
    if (category === 'anime') {
      options.animeStatuses = [status];
    } else {
      options.mangaStatuses = [status];
    }
    
    const { items } = await this.syncFromMAL(options);
    return items;
  }

  /**
   * Gets sync statistics
   * @returns Sync statistics
   */
  getSyncStats(): {
    lastSyncTime?: number;
    totalItems?: number;
  } {
    // This can be extended to store sync history in settings
    return {
      lastSyncTime: undefined,
      totalItems: undefined,
    };
  }
}

/**
 * Creates a sync manager instance
 * @param plugin Plugin instance
 * @returns Sync manager
 */
export function createSyncManager(plugin: CassettePlugin): SyncManager {
  return new SyncManager(plugin);
}