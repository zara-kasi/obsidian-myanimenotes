import { Notice } from 'obsidian';
import type CassettePlugin from '../main';
import { createDebugLogger } from '../utils';

/**
 * Auto-Sync Manager
 * 
 * Handles automatic periodic syncing based on user settings
 * Runs in the background at configured intervals
 */
export class AutoSyncManager {
  private intervalId: number | null = null;
  private plugin: CassettePlugin;
  private debug;

  constructor(plugin: CassettePlugin) {
    this.plugin = plugin;
    this.debug = createDebugLogger(plugin, 'Auto-Sync');
  }

  /**
   * Starts auto-sync if enabled in settings
   */
  start(): void {
    // Stop any existing interval first
    this.stop();

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

    // Convert minutes to milliseconds
    const intervalMs = this.plugin.settings.syncInterval * 60 * 1000;

    // Set up recurring sync
    this.intervalId = window.setInterval(async () => {
      await this.performAutoSync();
    }, intervalMs);

    this.debug.log(`[Auto-Sync] Started with interval: ${this.plugin.settings.syncInterval} minutes`);
  }

  /**
   * Stops auto-sync
   */
  stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
      this.debug.log('[Auto-Sync] Stopped');
    }
  }

  /**
   * Restarts auto-sync (useful when settings change)
   */
  restart(): void {
    this.debug.log('[Auto-Sync] Restarting...');
    this.stop();
    this.start();
  }

  /**
   * Checks if auto-sync is currently running
   */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Performs a single auto-sync operation
   */
  private async performAutoSync(): Promise<void> {
    this.debug.log('[Auto-Sync] Running scheduled sync...');

    // Double-check authentication before syncing
    if (!this.plugin.settings.malAuthenticated) {
      this.debug.log('[Auto-Sync] Skipped - not authenticated');
      this.stop(); // Stop auto-sync if no longer authenticated
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

      // Update last sync time
      this.plugin.settings.lastSyncTime = Date.now();
      await this.plugin.saveSettings();

      this.debug.log('[Auto-Sync] Completed successfully');

      // Optional: Show subtle notice for background sync
      if (this.plugin.settings.debugMode) {
        new Notice('✓ Auto-sync completed', 2000);
      }

    } catch (error) {
      console.error('[Auto-Sync] Failed:', error);
      
      // Show error notice
      new Notice(`⚠️ Auto-sync failed: ${error.message}`, 4000);
    }
  }

  /**
   * Gets time until next sync (in milliseconds)
   * Returns null if auto-sync is not running
   */
  getTimeUntilNextSync(): number | null {
    if (!this.isRunning() || !this.plugin.settings.lastSyncTime) {
      return null;
    }

    const intervalMs = this.plugin.settings.syncInterval * 60 * 1000;
    const timeSinceLastSync = Date.now() - this.plugin.settings.lastSyncTime;
    const timeUntilNext = intervalMs - timeSinceLastSync;

    return timeUntilNext > 0 ? timeUntilNext : 0;
  }

  /**
   * Gets formatted string for time until next sync
   */
  getFormattedTimeUntilNextSync(): string | null {
    const ms = this.getTimeUntilNextSync();
    if (ms === null) return null;

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

/**
 * Creates an auto-sync manager instance
 */
export function createAutoSyncManager(plugin: CassettePlugin): AutoSyncManager {
  return new AutoSyncManager(plugin);
}