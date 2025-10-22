import { Notice } from 'obsidian';
import type CassettePlugin from '../main';
import { createDebugLogger } from '../utils';

/**
 * Auto-Sync Manager
 * 
 * Handles one-time automatic sync after plugin load
 * Executes exactly once, 10 minutes after plugin initialization
 */
export class AutoSyncManager {
  private timeoutId: number | null = null;
  private plugin: CassettePlugin;
  private debug;
  private hasExecuted: boolean = false;

  // Fixed delay: 10 minutes in milliseconds
  private readonly SYNC_DELAY_MS = 10 * 60 * 1000;

  constructor(plugin: CassettePlugin) {
    this.plugin = plugin;
    this.debug = createDebugLogger(plugin, 'Auto-Sync');
  }

  /**
   * Starts auto-sync timer if enabled in settings
   * Executes exactly once, 10 minutes after this method is called
   */
  start(): void {
    // Stop any existing timer first
    this.stop();

    // Reset execution flag
    this.hasExecuted = false;

    // Only start if auto-sync is enabled
    if (!this.plugin.settings.autoSync) {
      this.debug.log('[Auto-Sync] Not enabled in settings');
      return;
    }

    // Check if authenticated
    if (!this.plugin.settings.malAuthenticated) {
      this.debug.log('[Auto-Sync] Skipped - not authenticated with MyAnimeList');
      return;
    }

    // Set up one-time sync timer (10 minutes)
    this.timeoutId = window.setTimeout(async () => {
      await this.performAutoSync();
      this.hasExecuted = true;
      this.timeoutId = null;
    }, this.SYNC_DELAY_MS);

    this.debug.log('[Auto-Sync] Scheduled to run in 10 minutes');
  }

  /**
   * Stops auto-sync timer
   * Cancels the pending sync if it hasn't executed yet
   */
  stop(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
      this.debug.log('[Auto-Sync] Stopped/Cancelled');
    }
  }

  /**
   * Restarts auto-sync timer
   * Useful when settings change or plugin reloads
   */
  restart(): void {
    this.debug.log('[Auto-Sync] Restarting...');
    this.stop();
    this.start();
  }

  /**
   * Checks if auto-sync timer is currently scheduled
   */
  isScheduled(): boolean {
    return this.timeoutId !== null;
  }

  /**
   * Checks if auto-sync has already executed in this session
   */
  hasAlreadyExecuted(): boolean {
    return this.hasExecuted;
  }

  /**
   * Performs a single auto-sync operation
   */
  private async performAutoSync(): Promise<void> {
    this.debug.log('[Auto-Sync] Executing scheduled sync...');

    // Double-check authentication before syncing
    if (!this.plugin.settings.malAuthenticated) {
      this.debug.log('[Auto-Sync] Skipped - not authenticated');
      return;
    }

    // Check if sync manager exists
    if (!this.plugin.syncManager) {
      console.error('[Auto-Sync] Sync manager not available');
      return;
    }

    try {
      // Perform the sync (quiet mode - no prominent notices)
      await this.plugin.syncManager.syncFromMAL();

      this.debug.log('[Auto-Sync] Completed successfully');


    } catch (error) {
      console.error('[Auto-Sync] Failed:', error);
      
      // Show error notice
      new Notice(`Cassette sync failed: ${error.message}`, 1500);
    }
  }
}

/**
 * Creates an auto-sync manager instance
 */
export function createAutoSyncManager(plugin: CassettePlugin): AutoSyncManager {
  return new AutoSyncManager(plugin);
}