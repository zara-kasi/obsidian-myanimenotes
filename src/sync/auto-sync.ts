import type CassettePlugin from '../main';
import { createDebugLogger } from '../utils';

const SYNC_ON_LOAD_DELAY = 1 * 60 * 1000; // 1 minutes (fast but non-blocking)
const MIN_SCHEDULED_INTERVAL = 30; // Minimum 30 minutes

/**
 * Manages auto-sync timers
 * Each sync type (syncOnLoad, scheduledSync) works independently
 */
export class AutoSyncManager {
  private plugin: CassettePlugin;
  private syncOnLoadTimer: NodeJS.Timeout | null = null;
  private scheduledSyncTimer: NodeJS.Timeout | null = null;
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

    // Start scheduled sync if enabled
    if (this.plugin.settings.scheduledSync) {
      this.startScheduledSync();
    }
  }

  /**
   * Stops all auto-sync timers
   */
  stop(): void {
    this.clearSyncOnLoadTimer();
    this.clearScheduledSyncTimer();
  }

  /**
   * Starts the sync-on-load timer (one-time, 3 seconds after load)
   * Uses a short delay to avoid blocking plugin initialization
   */
  private startSyncOnLoad(): void {
    this.clearSyncOnLoadTimer();

    // Check authentication before starting timer
    if (!this.isAuthenticated()) {
      this.debug.log('[Sync on Load] Skipped: Not authenticated with MAL');
      return;
    }

    this.debug.log('[Sync on Load] Timer started: Will sync in 3 seconds');

    this.syncOnLoadTimer = setTimeout(async () => {
      this.debug.log('[Sync on Load] Triggered after 3 seconds');
      
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
   * Starts the scheduled sync timer (repeating at configured interval)
   */
  private startScheduledSync(): void {
    this.clearScheduledSyncTimer();

    // Check authentication before starting timer
    if (!this.isAuthenticated()) {
      this.debug.log('[Scheduled Sync] Skipped: Not authenticated with MAL');
      return;
    }

    // Validate interval (minimum 30 minutes)
    const intervalMinutes = Math.max(
      this.plugin.settings.scheduledSyncInterval,
      MIN_SCHEDULED_INTERVAL
    );
    const intervalMs = intervalMinutes * 60 * 1000;

    this.debug.log(`[Scheduled Sync] Timer started: Will sync every ${intervalMinutes} minutes`);

    const runSync = async () => {
      this.debug.log('[Scheduled Sync] Triggered');
      
      // Check authentication at execution time
      if (!this.isAuthenticated()) {
        this.debug.log('[Scheduled Sync] Aborted: Not authenticated with MAL');
        return;
      }

      try {
        if (this.plugin.syncManager) {
          await this.plugin.syncManager.syncFromMAL();
          this.debug.log('[Scheduled Sync] Completed successfully');
        }
      } catch (error) {
        console.error('[Scheduled Sync] Failed:', error);
      }

      // Schedule next sync if still enabled and authenticated
      if (this.plugin.settings.scheduledSync && this.isAuthenticated()) {
        this.scheduledSyncTimer = setTimeout(runSync, intervalMs);
      } else {
        this.debug.log('[Scheduled Sync] Stopped: Either disabled or not authenticated');
      }
    };

    // Start the first timer
    this.scheduledSyncTimer = setTimeout(runSync, intervalMs);
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
   * Clears the scheduled sync timer
   */
  private clearScheduledSyncTimer(): void {
    if (this.scheduledSyncTimer) {
      clearTimeout(this.scheduledSyncTimer);
      this.scheduledSyncTimer = null;
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