import type MyAnimeNotesPlugin from '../main';
import { createDebugLogger } from '../utils';

const SYNC_ON_LOAD_DELAY = 2 * 60 * 1000; // 2 minutes (fast but non-blocking)
const MIN_SCHEDULED_INTERVAL = 60; // Minimum 60 minutes

/**
 * Manages auto-sync timers
 * Each sync type (syncOnLoad, scheduledSync) works independently
 * Now uses Obsidian's registerInterval for automatic cleanup
 */
export class AutoSyncManager {
  private plugin: MyAnimeNotesPlugin;
  private syncOnLoadTimer: number | null = null;
  private scheduledSyncTimer: number | null = null;
  private debug: ReturnType<typeof createDebugLogger>;

  constructor(plugin: MyAnimeNotesPlugin) {
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
   * Note: When using registerInterval, Obsidian handles cleanup automatically on unload
   * This method is kept for manual stop scenarios (e.g., settings changes)
   */
  stop(): void {
    this.clearSyncOnLoadTimer();
    this.clearScheduledSyncTimer();
  }

  /**
   * Checks if enough time has passed since last sync
   * Uses the same minimum interval as scheduled sync (60 minutes)
   */
  private hasMinimumIntervalPassed(): boolean {
    const lastSync = this.plugin.settings.lastSuccessfulSync;
    
    // If no previous sync, allow sync
    if (!lastSync) {
      this.debug.log('[Sync on Load] No previous sync found - allowing sync');
      return true;
    }
    
    const now = Date.now();
    const timeSinceLastSync = now - lastSync;
    const minimumIntervalMs = MIN_SCHEDULED_INTERVAL * 60 * 1000; // 60 minutes in ms
    
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
   * Uses registerInterval for automatic cleanup
   * Now respects minimum interval between syncs
   */
  private startSyncOnLoad(): void {
    this.clearSyncOnLoadTimer();

    // Check authentication before starting timer
    if (!this.isAuthenticated()) {
      this.debug.log('[Sync on Load] Skipped: Not authenticated with MAL');
      return;
    }

    this.debug.log('[Sync on Load] Timer started: Will sync in 2 minutes');

    // Use registerInterval for automatic cleanup
    // For one-time execution, we'll clear it after running
    this.syncOnLoadTimer = window.setTimeout(() => {
      void (async () => {
        this.debug.log('[Sync on Load] Timer triggered after 2 minutes');
        
        // Double-check authentication at execution time
        if (!this.isAuthenticated()) {
          this.debug.log('[Sync on Load] Aborted: Not authenticated with MAL');
          this.clearSyncOnLoadTimer();
          return;
        }

        // Check if minimum interval has passed since last sync
        if (!this.hasMinimumIntervalPassed()) {
          this.debug.log('[Sync on Load] Aborted: Minimum interval not met');
          this.clearSyncOnLoadTimer();
          return;
        }

        try {
          if (this.plugin.syncManager) {
            if (this.plugin.settings.optimizeAutoSync) {
              await this.plugin.syncManager.syncActiveStatuses();
            } else {
              await this.plugin.syncManager.syncFromMAL();
            }
            this.debug.log('[Sync on Load] Completed successfully');
          }
        } catch (error) {
          console.error('[Sync on Load] Failed:', error);
        } finally {
          // Clear the timer after execution since it's one-time
          this.clearSyncOnLoadTimer();
        }
      })();
    }, SYNC_ON_LOAD_DELAY);

    // Register with Obsidian for automatic cleanup on plugin unload
    this.plugin.registerInterval(this.syncOnLoadTimer);
  }

  /**
   * Starts the scheduled sync timer (repeating at configured interval)
   * Uses registerInterval for automatic cleanup
   */
  private startScheduledSync(): void {
    this.clearScheduledSyncTimer();

    // Check authentication before starting timer
    if (!this.isAuthenticated()) {
      this.debug.log('[Scheduled Sync] Skipped: Not authenticated with MAL');
      return;
    }

    // Validate interval (minimum 60 minutes)
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
        this.stop(); // Stop all timers if authentication is lost
        return;
      }

      try {
        if (this.plugin.syncManager) {
          if (this.plugin.settings.optimizeAutoSync) {
            await this.plugin.syncManager.syncActiveStatuses();
          } else {
            await this.plugin.syncManager.syncFromMAL();
          }
          this.debug.log('[Scheduled Sync] Completed successfully');
        }
      } catch (error) {
        console.error('[Scheduled Sync] Failed:', error);
      }
    };

    // Use setInterval for repeating execution
    // Obsidian's registerInterval handles both setTimeout and setInterval
    this.scheduledSyncTimer = window.setInterval(() => {
      void runSync();
    }, intervalMs);

    // Register with Obsidian for automatic cleanup on plugin unload
    this.plugin.registerInterval(this.scheduledSyncTimer);
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
   * When using registerInterval, manual clearing is still safe
   */
  private clearSyncOnLoadTimer(): void {
    if (this.syncOnLoadTimer !== null) {
      window.clearTimeout(this.syncOnLoadTimer);
      this.syncOnLoadTimer = null;
    }
  }

  /**
   * Clears the scheduled sync timer
   * When using registerInterval, manual clearing is still safe
   */
  private clearScheduledSyncTimer(): void {
    if (this.scheduledSyncTimer !== null) {
      window.clearInterval(this.scheduledSyncTimer);
      this.scheduledSyncTimer = null;
    }
  }
}

/**
 * Creates and starts the auto-sync manager
 */
export function createAutoSyncManager(plugin: MyAnimeNotesPlugin): AutoSyncManager {
  const manager = new AutoSyncManager(plugin);
  manager.start();
  return manager;
}