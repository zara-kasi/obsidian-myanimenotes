/**
 * Sync Guard and Cooldown Manager
 * 
 * Prevents multiple simultaneous sync operations and enforces cooldown periods.
 * Addresses race conditions and duplicate file creation caused by:
 * 1. Multiple overlapping sync operations
 * 2. MetadataCache not fully updating before second sync starts
 * 3. Stale index lookups causing false "file not found" results
 * 
 * Safety mechanisms:
 * - Mutex lock: Only ONE sync can run at a time (global)
 * - Cooldown: 5-minute minimum between syncs for cache updates
 * - Persistence: Timestamps survive plugin reload and Obsidian restart
 */

import type CassettePlugin from '../main';
import { createDebugLogger } from '../utils';

export interface SyncGuardState {
  isSyncing: boolean;
  lastSyncTime: number; // Timestamp of last completed sync
  activeSyncStartTime: number | null; // When current sync started (for duration tracking)
}

const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes (allows MetadataCache to fully update)
const SYNC_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes (safety timeout to prevent stuck syncs)

/**
 * Sync Guard Manager - Global concurrency control
 * 
 * Ensures only one sync operation runs at a time and enforces cooldown periods
 * between syncs to allow Obsidian's MetadataCache to fully process changes.
 */
export class SyncGuardManager {
  private plugin: CassettePlugin;
  private debug: ReturnType<typeof createDebugLogger>;
  
  // Sync state
  private isSyncing: boolean = false;
  private syncMutex: Promise<void> = Promise.resolve();
  private syncTimeout: NodeJS.Timeout | null = null;
  
  // Timing
  private lastSyncTime: number = 0;
  private activeSyncStartTime: number | null = null;

  constructor(plugin: CassettePlugin) {
    this.plugin = plugin;
    this.debug = createDebugLogger(plugin, 'SyncGuard');
    
    // Load last sync time from settings on initialization
    this.loadPersistedState();
  }

  /**
   * Loads persisted state from plugin settings
   * Called on manager creation to restore state across plugin reloads
   */
  private loadPersistedState(): void {
    const lastSync = this.plugin.settings.lastSuccessfulSync || 0;
    this.lastSyncTime = lastSync;
    
    this.debug.log(
      `[SyncGuard] Loaded persisted state: last sync ${new Date(lastSync).toLocaleString()}`
    );
  }

  /**
   * Acquires the sync lock
   * Waits until no other sync is in progress
   * 
   * Throws if:
   * - Cooldown period hasn't elapsed
   * - Current sync is stuck (timeout)
   */
  async acquireSyncLock(): Promise<void> {
    const now = Date.now();

    // Check if cooldown is active
    const timeSinceLastSync = now - this.lastSyncTime;
    if (timeSinceLastSync < SYNC_COOLDOWN_MS && this.lastSyncTime > 0) {
      const minutesRemaining = Math.ceil((SYNC_COOLDOWN_MS - timeSinceLastSync) / 60000);
      const error = `Sync cooldown active. Last synced ${Math.floor(timeSinceLastSync / 60000)} minutes ago. Wait ${minutesRemaining} more minutes.`;
      
      this.debug.log(`[SyncGuard] ${error}`);
      throw new Error(error);
    }

    // Check if sync is already in progress
    if (this.isSyncing) {
      const syncDuration = this.activeSyncStartTime 
        ? Math.floor((now - this.activeSyncStartTime) / 1000)
        : 0;
      
      const error = `Sync already in progress (${syncDuration}s elapsed). Please wait...`;
      
      this.debug.log(`[SyncGuard] ${error}`);
      throw new Error(error);
    }

    // Check for stuck sync (timeout safety)
    if (this.activeSyncStartTime && (now - this.activeSyncStartTime) > SYNC_TIMEOUT_MS) {
      this.debug.log('[SyncGuard] WARNING: Stuck sync detected, force-releasing...');
      this.releaseSyncLock();
    }

    // Set sync state
    this.isSyncing = true;
    this.activeSyncStartTime = now;

    this.debug.log('[SyncGuard] Sync lock acquired');

    // Set safety timeout to prevent stuck syncs
    this.syncTimeout = setTimeout(() => {
      if (this.isSyncing) {
        this.debug.log('[SyncGuard] TIMEOUT: Sync exceeded 30 minutes, force-releasing');
        this.releaseSyncLock();
      }
    }, SYNC_TIMEOUT_MS);
  }

  /**
   * Releases the sync lock and starts cooldown
   * Called after sync completes (success or failure)
   * 
   * Updates persisted state in plugin settings
   */
  async releaseSyncLock(): Promise<void> {
    if (!this.isSyncing) {
      this.debug.log('[SyncGuard] WARNING: Attempted to release lock when not syncing');
      return;
    }

    // Clear safety timeout
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    // Record sync duration
    const syncDuration = this.activeSyncStartTime
      ? Math.floor((Date.now() - this.activeSyncStartTime) / 1000)
      : 0;

    // Update sync state
    this.isSyncing = false;
    this.lastSyncTime = Date.now();
    this.activeSyncStartTime = null;

    // Persist state to settings (survives plugin reload and Obsidian restart)
    this.plugin.settings.lastSuccessfulSync = this.lastSyncTime;
    await this.plugin.saveSettings();

    this.debug.log(
      `[SyncGuard] Sync lock released. Duration: ${syncDuration}s. ` +
      `Cooldown until: ${new Date(this.lastSyncTime + SYNC_COOLDOWN_MS).toLocaleString()}`
    );
  }

  /**
   * Checks if sync can proceed without waiting
   * Used for non-blocking status checks
   */
  canSyncNow(): { allowed: boolean; reason?: string; minutesRemaining?: number } {
    const now = Date.now();

    // Check if already syncing
    if (this.isSyncing) {
      const syncDuration = this.activeSyncStartTime
        ? Math.floor((Date.now() - this.activeSyncStartTime) / 1000)
        : 0;
      return {
        allowed: false,
        reason: `Sync in progress (${syncDuration}s elapsed)`
      };
    }

    // Check if cooldown is active
    const timeSinceLastSync = now - this.lastSyncTime;
    if (timeSinceLastSync < SYNC_COOLDOWN_MS && this.lastSyncTime > 0) {
      const minutesRemaining = Math.ceil((SYNC_COOLDOWN_MS - timeSinceLastSync) / 60000);
      return {
        allowed: false,
        reason: `Cooldown active`,
        minutesRemaining
      };
    }

    return { allowed: true };
  }

  /**
   * Gets current sync state and timing information
   */
  getState(): SyncGuardState {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      activeSyncStartTime: this.activeSyncStartTime
    };
  }

  /**
   * Gets human-readable status message
   */
  getStatusMessage(): string {
    const state = this.canSyncNow();

    if (state.allowed) {
      const lastSyncStr = this.lastSyncTime
        ? `Last synced: ${new Date(this.lastSyncTime).toLocaleString()}`
        : 'Never synced';
      return `✅ Ready to sync. ${lastSyncStr}`;
    }

    if (state.reason?.includes('in progress')) {
      return `⚠️ ${state.reason}`;
    }

    if (state.minutesRemaining) {
      return `⏱️ Cooldown active. Next sync in ${state.minutesRemaining} minute${state.minutesRemaining > 1 ? 's' : ''}`;
    }

    return `⏱️ ${state.reason}`;
  }

  /**
   * Executes a sync function with lock protection
   * Automatically acquires lock before execution and releases after
   * 
   * @param syncFn - The sync function to execute
   * @returns Result of sync function
   * @throws Error if lock can't be acquired or sync fails
   */
  async withSyncLock<T>(syncFn: () => Promise<T>): Promise<T> {
    await this.acquireSyncLock();

    try {
      const result = await syncFn();
      return result;
    } catch (error) {
      // Release lock even on error to allow retry
      throw error;
    } finally {
      await this.releaseSyncLock();
    }
  }

  /**
   * Force resets the sync guard (emergency only)
   * Use only for testing or if sync gets stuck
   * 
   * This bypasses all safety checks - use with caution!
   */
  forceReset(): void {
    this.debug.log('[SyncGuard] FORCE RESET called - clearing sync state');

    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    this.isSyncing = false;
    this.activeSyncStartTime = null;
  }

  /**
   * Gets timing information for UI display
   */
  getTimingInfo(): {
    issyncing: boolean;
    syncDurationSeconds?: number;
    timeSinceLastSyncMinutes?: number;
    cooldownRemainingMinutes?: number;
    nextSyncAvailableAt?: string;
  } {
    const now = Date.now();
    const state = this.canSyncNow();

    let syncDurationSeconds: number | undefined;
    if (this.isSyncing && this.activeSyncStartTime) {
      syncDurationSeconds = Math.floor((now - this.activeSyncStartTime) / 1000);
    }

    let timeSinceLastSyncMinutes: number | undefined;
    if (this.lastSyncTime > 0) {
      timeSinceLastSyncMinutes = Math.floor((now - this.lastSyncTime) / 60000);
    }

    let cooldownRemainingMinutes: number | undefined;
    let nextSyncAvailableAt: string | undefined;
    if (!state.allowed && state.minutesRemaining) {
      cooldownRemainingMinutes = state.minutesRemaining;
      nextSyncAvailableAt = new Date(this.lastSyncTime + SYNC_COOLDOWN_MS).toLocaleString();
    }

    return {
      issyncing: this.isSyncing,
      syncDurationSeconds,
      timeSinceLastSyncMinutes,
      cooldownRemainingMinutes,
      nextSyncAvailableAt
    };
  }

  /**
   * Clears all state (called during plugin unload)
   */
  clear(): void {
    if (this.syncTimeout) {
      clearTimeout(this.syncTimeout);
      this.syncTimeout = null;
    }

    this.isSyncing = false;
    this.activeSyncStartTime = null;

    this.debug.log('[SyncGuard] Cleared all state');
  }
}

/**
 * Creates a sync guard manager instance
 */
export function createSyncGuardManager(plugin: CassettePlugin): SyncGuardManager {
  return new SyncGuardManager(plugin);
}