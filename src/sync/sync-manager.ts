/**
 * Sync Manager - Template System Only
 * 
 * No more StorageConfig - everything from templates
 */

import type CassettePlugin from '../main';
import type { UniversalMediaItem, SyncResult } from '../models';
import { MediaCategory } from '../models';
import { syncMAL, type MALSyncOptions } from './mal-sync-service';
import { saveMediaItemsByCategory } from '../storage';
import { createDebugLogger, type DebugLogger } from '../utils';
import { showNotice } from '../utils';

/**
 * Complete sync options
 * Simplified - no more storageConfig
 */
export interface CompleteSyncOptions extends MALSyncOptions {
  saveToVault?: boolean;
}

const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Sync manager class
 */
export class SyncManager {
  private debug: DebugLogger;
  private isSyncing: boolean = false;
  private lastSyncTime: number = 0;
  
  constructor(private plugin: CassettePlugin) {
    this.debug = createDebugLogger(plugin, 'Sync Manager');
    this.lastSyncTime = plugin.settings.lastSuccessfulSync || 0;
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
   * Check if sync can proceed
   */
  private checkSyncGuard(): boolean {
    if (this.isSyncing) {
      this.debug.log('[Sync Manager] Sync already in progress');
      showNotice(this.plugin, 'Sync already in progress.', 4000);
      return false;
    }

    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    if (this.lastSyncTime > 0 && timeSinceLastSync < SYNC_COOLDOWN_MS) {
      const minutesRemaining = Math.ceil((SYNC_COOLDOWN_MS - timeSinceLastSync) / 60000);
      this.debug.log(`[Sync Manager] Sync cooldown active - ${minutesRemaining} minute(s) remaining`);
      showNotice(
        this.plugin, 
        `Please wait ${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''} before syncing again.`,
        4000
      );
      return false;
    }

    return true;
  }

  /**
   * Performs a complete sync from MAL
   * Uses template system automatically
   */
  async syncFromMAL(options: CompleteSyncOptions = {}): Promise<{
    items: UniversalMediaItem[];
    result: SyncResult;
    savedPaths?: { anime: string[]; manga: string[] };
  }> {
    if (!this.checkSyncGuard()) {
      return { 
        items: [], 
        result: {
          success: false,
          itemsProcessed: 0,
          itemsSucceeded: 0,
          itemsFailed: 0,
          results: [],
          errors: [],
          startTime: Date.now(),
          endTime: Date.now(),
        }
      };
    }
    
    this.isSyncing = true;

    try {
      this.debug.log('[Sync Manager] Starting MAL sync...', options);
      
      // Ensure cassette index is initialized
      if (this.plugin.cassetteIndex) {
        this.debug.log('[Sync Manager] Ensuring cassette index is initialized...');
        await this.plugin.cassetteIndex.ensureInitialized();
        this.debug.log('[Sync Manager] Cassette index ready');
      }
      
      // Perform sync
      const { items, result } = await syncMAL(this.plugin, options);
      
      // Save to vault if enabled
      let savedPaths: { anime: string[]; manga: string[] } | undefined;
      
      if (options.saveToVault !== false && items.length > 0) {
        try {
          // No config needed - templates handle everything
          savedPaths = await saveMediaItemsByCategory(this.plugin, items);
          
          this.debug.log('[Sync Manager] Saved to vault:', savedPaths);
        } catch (saveError) {
          console.error('[Sync Manager] Failed to save to vault:', saveError);
          const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
          showNotice(this.plugin, `⚠️ Synced but failed to save: ${errorMessage}`, 5000);
        }        
      }
      
      // Update last sync time
      this.lastSyncTime = Date.now();
      this.plugin.settings.lastSuccessfulSync = this.lastSyncTime;
      await this.plugin.saveSettings();
      
      return { items, result, savedPaths };
      
    } catch (error) {
      console.error('[Sync Manager] Sync failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Quick sync for a specific category
   */
  async quickSync(
    category: MediaCategory,
    saveToVault: boolean = true
  ): Promise<UniversalMediaItem[]> {
    this.debug.log(`[Sync Manager] Quick sync for ${category}...`);
    
    const options: CompleteSyncOptions = {
      syncAnime: category === MediaCategory.ANIME,
      syncManga: category === MediaCategory.MANGA,
      saveToVault
    };
    
    const { items } = await this.syncFromMAL(options);
    return items;
  }

  /**
   * Syncs only anime
   */
  async syncAnime(saveToVault: boolean = true): Promise<UniversalMediaItem[]> {
    return this.quickSync(MediaCategory.ANIME, saveToVault);
  }

  /**
   * Syncs only manga
   */
  async syncManga(saveToVault: boolean = true): Promise<UniversalMediaItem[]> {
    return this.quickSync(MediaCategory.MANGA, saveToVault);
  }

  /**
   * Syncs active statuses: Watching anime + Reading manga
   */
  async syncActiveStatuses(saveToVault: boolean = true): Promise<UniversalMediaItem[]> {
    this.debug.log('[Sync Manager] Syncing active statuses...');
    
    const options: CompleteSyncOptions = {
      syncAnime: true,
      syncManga: true,
      animeStatuses: ['watching'],
      mangaStatuses: ['reading'],
      saveToVault,
    };
    
    const { items } = await this.syncFromMAL(options);
    return items;
  }

  /**
   * Gets sync statistics
   */
  getSyncStats(): {
    totalItems?: number;
    lastSyncTime?: number;
  } {
    return {
      totalItems: undefined,
      lastSyncTime: this.plugin.settings.lastSuccessfulSync,
    };
  }
}

/**
 * Creates a sync manager instance
 */
export function createSyncManager(plugin: CassettePlugin): SyncManager {
  return new SyncManager(plugin);
}
