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
   * Performs a complete sync from MAL
   * @param options Sync options
   * @returns Synced items and result
   */
  async syncFromMAL(options: CompleteSyncOptions = {}): Promise<{
    items: UniversalMediaItem[];
    result: SyncResult;
    savedPaths?: { anime: string[]; manga: string[] };
  }> {
    this.debug.log('[Sync Manager] Starting MAL sync...', options);
    
    try {
      // Perform sync
      const { items, result } = await syncMAL(this.plugin, options);
      
      // Save to vault if enabled
      let savedPaths: { anime: string[]; manga: string[] } | undefined;
      
      if (options.saveToVault !== false && items.length > 0) {
        try {
          const storageConfig = options.storageConfig || this.getStorageConfig();
          
          savedPaths = await saveMediaItemsByCategory(
            this.plugin,
            items,
            storageConfig
          );
          
          this.debug.log('[Sync Manager] Saved to vault:', savedPaths);
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
  } {
    return {
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