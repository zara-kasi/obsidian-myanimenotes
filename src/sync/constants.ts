/**
 * Time to wait between sync operations to prevent rate limiting or conflicts.
 */
export const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

import type { MALSyncOptions } from "./types";

/**
 * Default sync options
 */
export const DEFAULT_SYNC_OPTIONS: MALSyncOptions = {
    syncAnime: true,
    syncManga: true
};
