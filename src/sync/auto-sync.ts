import type CassettePlugin from '../main';
import { createDebugLogger } from '../utils';

const SYNC_ON_LOAD_DELAY = 5 * 60 * 1000; // 5 minutes in milliseconds
const MIN_BACKGROUND_INTERVAL = 30; // Minimum 30 minutes

/**
 * Manages auto-sync timers
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
   */
  start(): void {
    // Check if auto-sync is enabled at all
    if (!this.plugin.settings.autoSync) {
      this.debug.log('Auto-sync disabled in settings');
      return;
    }

    // Check if authenticated with MAL
    if (!this.plugin.settings.malAuthenticated || !this.plugin.settings.malAccessToken) {
      this.debug.log('Skipped: Not authenticated with MAL');
      return;
    }

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

    this.debug.log('[Sync on Load] Timer started: Will sync in 5 minutes');

    this.syncOnLoadTimer = setTimeout(async () => {
      this.debug.log('[Sync on Load] Triggered after 5 minutes');
      
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

    // Validate interval (minimum 30 minutes)
    const intervalMinutes = Math.max(
      this.plugin.settings.backgroundSyncInterval,
      MIN_BACKGROUND_INTERVAL
    );
    const intervalMs = intervalMinutes * 60 * 1000;

    this.debug.log(`[Background Sync] Timer started: Will sync every ${intervalMinutes} minutes`);

    const runSync = async () => {
      this.debug.log('[Background Sync] Triggered');
      
      try {
        if (this.plugin.syncManager) {
          await this.plugin.syncManager.syncFromMAL();
          this.debug.log('[Background Sync] Completed successfully');
        }
      } catch (error) {
        console.error('[Background Sync] Failed:', error);
      }

      // Schedule next sync if still enabled
      if (this.plugin.settings.autoSync && this.plugin.settings.backgroundSync) {
        this.backgroundSyncTimer = setTimeout(runSync, intervalMs);
      }
    };

    // Start the first timer
    this.backgroundSyncTimer = setTimeout(runSync, intervalMs);
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