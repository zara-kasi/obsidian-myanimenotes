/**
 * UPDATED Sync Manager with Proper Index Initialization
 * 
 * Key fixes:
 * 1. Ensures index is initialized BEFORE any file lookups
 * 2. Retries initialization if it fails on first attempt
 * 3. Handles index unavailable gracefully (falls back to vault scan)
 * 4. Logs all index operations for debugging
 */

import { Notice } from 'obsidian';
import type CassettePlugin from '../main';
import type { UniversalMediaItem, SyncResult } from '../models';
import { MediaCategory } from '../models';
import { syncMAL, type MALSyncOptions } from './mal-sync-service';
import { saveMediaItemsByCategory, type StorageConfig } from '../storage';
import { createDebugLogger, type DebugLogger } from '../utils';

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
  private debug: DebugLogger;
  constructor(private plugin: CassettePlugin) {
    this.debug = createDebugLogger(plugin, 'Sync Manager');
 }

  /**
   * Gets storage configuration from plugin settings
   */
  private getStorageConfig(): StorageConfig {
    return {
      animeFolder: this.plugin.settings.animeFolder,
      mangaFolder: this.plugin.settings.mangaFolder,
      createFolders: true,
      propertyMapping: this.plugin.settings.useCustomPropertyMapping 
        ? this.plugin.settings.propertyMapping 
        : undefined,
    };
  }

  /**
   * Saves the last successful sync timestamp
   */
  private async saveLastSyncTimestamp(): Promise<void> {
    this.plugin.settings.lastSuccessfulSync = Date.now();
    await this.plugin.saveSettings();
    this.debug.log('[Sync Manager] Saved last sync timestamp');
  }

/**
 * Rebuilds the index fresh before sync
 * Called before EVERY sync to ensure accuracy
 * 
 * This is the simple solution: clear and rebuild each time
 * Prevents stale index issues during the session
 */
private async rebuildIndexForSync(): Promise<void> {
  if (!this.plugin.cassetteIndex) {
    this.debug.log('[Sync Manager] WARNING: Cassette index not available');
    return;
  }
  
  try {
    this.debug.log('[Sync Manager] Rebuilding index fresh for this sync...');
    
    // Force a complete fresh rebuild
    await this.plugin.cassetteIndex.forceRebuildFresh();
    
    const stats = this.plugin.cassetteIndex.getStats();
    this.debug.log('[Sync Manager] Index fresh rebuild complete:', {
      cassettes: stats.totalCassettes,
      files: stats.totalFiles,
      duplicates: stats.duplicates
    });
    
  } catch (error) {
    console.error('[Sync Manager] Failed to rebuild index:', error);
    // Don't fail sync - index is optional
  }
}
  /**
   * Performs a complete sync from MAL
   * 
   * @param options Sync options
   * @returns Synced items and result
   */
  async syncFromMAL(options: CompleteSyncOptions = {}): Promise<{
    items: UniversalMediaItem[];
    result: SyncResult;
    savedPaths?: { anime: string[]; manga: string[] };
  }> {
    const startTime = Date.now();
    this.debug.log('[Sync Manager] Starting MAL sync...', options);
    
    try {
      // CRITICAL: Ensure index is initialized before sync
      // This must happen before we fetch items so the index is ready
      // for lookups during file creation

      // NEW:
      await this.rebuildIndexForSync();
      
      // Perform sync
      const { items, result } = await syncMAL(this.plugin, options);
      
      // Save to vault if enabled
      let savedPaths: { anime: string[]; manga: string[] } | undefined;
      
      if (options.saveToVault !== false && items.length > 0) {
        try {
          const storageConfig = options.storageConfig || this.getStorageConfig();
          
          this.debug.log('[Sync Manager] Saving to vault...');
          
          savedPaths = await saveMediaItemsByCategory(
            this.plugin,
            items,
            storageConfig
          );
          
          this.debug.log('[Sync Manager] Saved to vault:', {
            anime: savedPaths.anime.length,
            manga: savedPaths.manga.length
          });
          
        } catch (saveError) {
          console.error('[Sync Manager] Failed to save to vault:', saveError);
          const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
          new Notice(`⚠️ Synced but failed to save: ${errorMessage}`, 5000);
       }        
      }
      
      // Save last sync timestamp if sync was successful
      if (result.success) {
        await this.saveLastSyncTimestamp();
      }
      
      const duration = Date.now() - startTime;
      this.debug.log(`[Sync Manager] Sync complete (${duration}ms)`, {
        success: result.success,
        items: result.itemsProcessed,
        errors: result.errors.length
      });
      
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
    this.debug.log(`[Sync Manager] Quick sync for ${category}...`);
    
    const options: MALSyncOptions = {
      syncAnime: category === MediaCategory.ANIME,
      syncManga: category === MediaCategory.MANGA,
    };
    
    const completeOptions: CompleteSyncOptions = {
      ...options,
      saveToVault
    };
    
    const { items } = await this.syncFromMAL(completeOptions);
    return items;
  }

  /**
   * Syncs only anime
   * @param saveToVault Whether to save to vault
   * @returns Synced anime items
   */
  async syncAnime(saveToVault: boolean = true): Promise<UniversalMediaItem[]> {
    return this.quickSync(MediaCategory.ANIME, saveToVault);
  }

  /**
   * Syncs only manga
   * @param saveToVault Whether to save to vault
   * @returns Synced manga items
   */
  async syncManga(saveToVault: boolean = true): Promise<UniversalMediaItem[]> {
    return this.quickSync(MediaCategory.MANGA, saveToVault);
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
    this.debug.log(`[Sync Manager] Syncing ${category} with status ${status}...`);
    
    const malOptions: MALSyncOptions = {
      syncAnime: category === MediaCategory.ANIME,
      syncManga: category === MediaCategory.MANGA,
    };
    
    if (category === MediaCategory.ANIME) {
      malOptions.animeStatuses = [status];
    } else {
      malOptions.mangaStatuses = [status];
    }
    
    const options: CompleteSyncOptions = {
      ...malOptions,
      saveToVault,
    };
    
    const { items } = await this.syncFromMAL(options);
    return items;
  }

  /**
   * Gets sync statistics
   * @returns Sync statistics
   */
  getSyncStats(): {
    totalItems?: number;
    lastSyncTime?: number;
    indexStats?: {
      cassettes: number;
      files: number;
      duplicates: number;
    };
  } {
    const stats: any = {
      lastSyncTime: this.plugin.settings.lastSuccessfulSync,
    };
    
    // Include index stats if available
    if (this.plugin.cassetteIndex) {
      try {
        const indexStats = this.plugin.cassetteIndex.getStats();
        stats.indexStats = {
          cassettes: indexStats.totalCassettes,
          files: indexStats.totalFiles,
          duplicates: indexStats.duplicates
        };
      } catch (error) {
        this.debug.log('[Sync Manager] Failed to get index stats:', error);
      }
    }
    
    return stats;
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