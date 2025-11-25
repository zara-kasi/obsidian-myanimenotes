import type CassettePlugin from '../main';
import { createDebugLogger } from '../utils';
import type { MALSyncOptions } from './mal-sync-service';

const SYNC_ON_LOAD_DELAY = 2 * 60 * 1000; // 2 minute (fast but non-blocking)
const MIN_SCHEDULED_INTERVAL = 60; // Minimum 60 minutes

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
   * Builds sync options based on optimization setting
   * When optimized: only sync active statuses (watching/reading)
   * When not optimized: sync full lists (existing behavior)
   * NEW: This method determines what gets synced
   */
  private buildAutoSyncOptions(): MALSyncOptions {
    if (this.plugin.settings.optimizeAutoSync) {
      // Optimization ENABLED: only sync watching anime and reading manga
      this.debug.log('[Auto Sync] Optimization enabled - syncing active statuses only');
      return {
        syncAnime: true,
        syncManga: true,
        animeStatuses: ['watching'],      // Only "watching" anime
        mangaStatuses: ['reading'],       // Only "reading" manga
      };
    } else {
      // Optimization DISABLED: sync everything like before
      this.debug.log('[Auto Sync] Optimization disabled - syncing full lists');
      return {
        syncAnime: true,
        syncManga: true,
        // No status filters = get full list
      };
    }
  }

  /**
   * Checks if enough time has passed since last sync
   * Uses the same minimum interval as scheduled sync (60 minutes)
   */
  private hasMinimumIntervalPassed(): boolean {
    const lastSync = this.plugin.settings.lastSuccessfulSync;
    
    if (!lastSync) {
      this.debug.log('[Sync on Load] No previous sync found - allowing sync');
      return true;
    }
    
    const now = Date.now();
    const timeSinceLastSync = now - lastSync;
    const minimumIntervalMs = MIN_SCHEDULED_INTERVAL * 60 * 1000;
    
    const hasPassed = timeSinceLastSync >= minimumIntervalMs;
    
    if (!hasPassed) {
      const minutesSinceLastSync = Math.floor(timeSinceLastSync / 60000);
      const minutesRemaining = MIN_SCHEDULED_INTERVAL - minutesSinceLastSync;
      this.debug.log(
        `[Sync on Load] Minimum interval not met: ` +
        `${minutesSinceLastSync} minutes since last sync, ` +
        `${minutesRemaining} minutes remaining`
      );
    }
    
    return hasPassed;
  }

  /**
   * Starts the sync-on-load timer (one-time, 2 minutes after load)
   * Now uses optimized sync options
   */
  private startSyncOnLoad(): void {
    this.clearSyncOnLoadTimer();

    if (!this.isAuthenticated()) {
      this.debug.log('[Sync on Load] Skipped: Not authenticated with MAL');
      return;
    }

    this.debug.log('[Sync on Load] Timer started: Will sync in 2 minutes');

    this.syncOnLoadTimer = setTimeout(async () => {
      this.debug.log('[Sync on Load] Timer triggered after 2 minutes');
      
      if (!this.isAuthenticated()) {
        this.debug.log('[Sync on Load] Aborted: Not authenticated with MAL');
        return;
      }

      if (!this.hasMinimumIntervalPassed()) {
        this.debug.log('[Sync on Load] Aborted: Minimum interval not met');
        return;
      }

      try {
        if (this.plugin.syncManager) {
          // NEW: Build options based on optimization setting
          const options = this.buildAutoSyncOptions();
          await this.plugin.syncManager.syncFromMAL({
            saveToVault: true,
            ...options
          });
          this.debug.log('[Sync on Load] Completed successfully');
        }
      } catch (error) {
        console.error('[Sync on Load] Failed:', error);
      }
    }, SYNC_ON_LOAD_DELAY);
  }

  /**
   * Starts the scheduled sync timer (repeating at configured interval)
   * Now uses optimized sync options
   */
  private startScheduledSync(): void {
    this.clearScheduledSyncTimer();

    if (!this.isAuthenticated()) {
      this.debug.log('[Scheduled Sync] Skipped: Not authenticated with MAL');
      return;
    }

    const intervalMinutes = Math.max(
      this.plugin.settings.scheduledSyncInterval,
      MIN_SCHEDULED_INTERVAL
    );
    const intervalMs = intervalMinutes * 60 * 1000;

    this.debug.log(`[Scheduled Sync] Timer started: Will sync every ${intervalMinutes} minutes`);

    const runSync = async () => {
      this.debug.log('[Scheduled Sync] Triggered');
      
      if (!this.isAuthenticated()) {
        this.debug.log('[Scheduled Sync] Aborted: Not authenticated with MAL');
        return;
      }

      try {
        if (this.plugin.syncManager) {
          // NEW: Build options based on optimization setting
          const options = this.buildAutoSyncOptions();
          await this.plugin.syncManager.syncFromMAL({
            saveToVault: true,
            ...options
          });
          this.debug.log('[Scheduled Sync] Completed successfully');
        }
      } catch (error) {
        console.error('[Scheduled Sync] Failed:', error);
      }

      if (this.plugin.settings.scheduledSync && this.isAuthenticated()) {
        this.scheduledSyncTimer = setTimeout(runSync, intervalMs);
      } else {
        this.debug.log('[Scheduled Sync] Stopped: Either disabled or not authenticated');
      }
    };

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