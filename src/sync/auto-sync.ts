import type CassettePlugin from '../main';
import { createDebugLogger } from '../utils';

const SYNC_ON_LOAD_DELAY = 5 * 60 * 1000; // 5 minutes in milliseconds
const MIN_BACKGROUND_INTERVAL = 30; // Minimum 30 minutes

/**
 * Manages auto-sync timers
 * Each sync type (syncOnLoad, backgroundSync) works independently
 */
export class AutoSyncManager {
  private plugin: CassettePlugin;
  private syncOnLoadTimer: NodeJS.Timeout | null = null;
  private backgroundSyncTimer: NodeJS.Timeout | null = null;
  private debug: ReturnType<typeof createDebugLogger>;

  constructor(plugin: CassettePlugin) {
    this.plugin = plugin;
    this.debug = createDebugLogger(plugin, 'Auto Sync');
  }

  /**
   * Starts all enabled auto-sync timers
   * Each timer checks authentication independently
   */
  start(): void {
    // Start sync on load if enabled
    if (this.plugin.settings.syncOnLoad) {
      this.startSyncOnLoad();
    }

    // Start background sync if enabled
    if (this.plugin.settings.backgroundSync) {
      this.startBackgroundSync();
    }
  }

  /**
   * Stops all auto-sync timers
   */
  stop(): void {
    this.clearSyncOnLoadTimer();
    this.clearBackgroundSyncTimer();
  }

  /**
   * Starts the sync-on-load timer (one-time, 5 minutes after load)
   */
  private startSyncOnLoad(): void {
    this.clearSyncOnLoadTimer();

    // Check authentication before starting timer
    if (!this.isAuthenticated()) {
      this.debug.log('[Sync on Load] Skipped: Not authenticated with MAL');
      return;
    }

    this.debug.log('[Sync on Load] Timer started: Will sync in 5 minutes');

    this.syncOnLoadTimer = setTimeout(async () => {
      this.debug.log('[Sync on Load] Triggered after 5 minutes');
      
      // Double-check authentication at execution time
      if (!this.isAuthenticated()) {
        this.debug.log('[Sync on Load] Aborted: Not authenticated with MAL');
        return;
      }

      try {
        if (this.plugin.syncManager) {
          await this.plugin.syncManager.syncFromMAL();
          this.debug.log('[Sync on Load] Completed successfully');
        }
      } catch (error) {
        console.error('[Sync on Load] Failed:', error);
      }
    }, SYNC_ON_LOAD_DELAY);
  }

  /**
   * Starts the background sync timer (repeating at configured interval)
   */
  private startBackgroundSync(): void {
    this.clearBackgroundSyncTimer();

    // Check authentication before starting timer
    if (!this.isAuthenticated()) {
      this.debug.log('[Background Sync] Skipped: Not authenticated with MAL');
      return;
    }

    // Validate interval (minimum 30 minutes)
    const intervalMinutes = Math.max(
      this.plugin.settings.backgroundSyncInterval,
      MIN_BACKGROUND_INTERVAL
    );
    const intervalMs = intervalMinutes * 60 * 1000;

    this.debug.log(`[Background Sync] Timer started: Will sync every ${intervalMinutes} minutes`);

    const runSync = async () => {
      this.debug.log('[Background Sync] Triggered');
      
      // Check authentication at execution time
      if (!this.isAuthenticated()) {
        this.debug.log('[Background Sync] Aborted: Not authenticated with MAL');
        return;
      }

      try {
        if (this.plugin.syncManager) {
          await this.plugin.syncManager.syncFromMAL();
          this.debug.log('[Background Sync] Completed successfully');
        }
      } catch (error) {
        console.error('[Background Sync] Failed:', error);
      }

      // Schedule next sync if still enabled and authenticated
      if (this.plugin.settings.backgroundSync && this.isAuthenticated()) {
        this.backgroundSyncTimer = setTimeout(runSync, intervalMs);
      } else {
        this.debug.log('[Background Sync] Stopped: Either disabled or not authenticated');
      }
    };

    // Start the first timer
    this.backgroundSyncTimer = setTimeout(runSync, intervalMs);
  }

  /**
   * Checks if authenticated with MAL
   */
  private isAuthenticated(): boolean {
    return !!(
      this.plugin.settings.malAuthenticated && 
      this.plugin.settings.malAccessToken
    );
  }

  /**
   * Clears the sync-on-load timer
   */
  private clearSyncOnLoadTimer(): void {
    if (this.syncOnLoadTimer) {
      clearTimeout(this.syncOnLoadTimer);
      this.syncOnLoadTimer = null;
    }
  }

  /**
   * Clears the background sync timer
   */
  private clearBackgroundSyncTimer(): void {
    if (this.backgroundSyncTimer) {
      clearTimeout(this.backgroundSyncTimer);
      this.backgroundSyncTimer = null;
    }
  }
}

/**
 * Creates and starts the auto-sync manager
 */
export function createAutoSyncManager(plugin: CassettePlugin): AutoSyncManager {
  const manager = new AutoSyncManager(plugin);
  manager.start();
  return manager;
}