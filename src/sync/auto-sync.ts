import type CassettePlugin from '../main';
import { createDebugLogger } from '../utils';

/**
 * Starts the auto-sync timer if enabled and authenticated
 * @param plugin Plugin instance
 * @returns Timer ID or null
 */
export function startAutoSyncTimer(plugin: CassettePlugin): NodeJS.Timeout | null {
  const debug = createDebugLogger(plugin, 'Auto Sync');
  
  // Check if feature is enabled
  if (!plugin.settings.autoSync) {
    debug.log('[Auto Sync] Feature disabled in settings');
    return null;
  }

  // Check if authenticated with MAL
  if (!plugin.settings.malAuthenticated || !plugin.settings.malAccessToken) {
    debug.log('[Auto Sync] Skipped: Not authenticated with MAL');
    return null;
  }

  debug.log('[Auto Sync] Timer started: Will sync in 10 minutes');

  // Set 10-minute timer (600000 ms = 10 minutes)
  const timer = setTimeout(async () => {
    debug.log('[Auto Sync] Triggered after 10 minutes');
    
    try {
      if (plugin.syncManager) {
        await plugin.syncManager.syncFromMAL();
        debug.log('[Auto Sync] Completed successfully');
      }
    } catch (error) {
      console.error('[Auto Sync] Failed:', error);
    }
  }, 10 * 60 * 1000); // 10 minutes in milliseconds

  return timer;
}

/**
 * Clears the auto-sync timer
 * @param timer Timer to clear
 */
export function clearAutoSyncTimer(timer: NodeJS.Timeout | null): void {
  if (timer) {
    clearTimeout(timer);
  }
}