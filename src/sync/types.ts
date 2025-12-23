import type { StorageConfig } from "../storage";

/**
 * Sync result for a single item
 */
export interface SyncItemResult {
    id: number;
    title: string;
    success: boolean;
    error?: string;
    action?: "created" | "updated" | "skipped";
}

/**
 * Overall sync result
 */
export interface SyncResult {
    success: boolean;
    itemsProcessed: number;
    itemsSucceeded: number;
    itemsFailed: number;
    results: SyncItemResult[];
    errors: string[];
    startTime: number;
    endTime: number;
}

/**
 * Complete sync options
 * Moved from sync-manager.ts to centralize type definitions
 */
export interface CompleteSyncOptions extends MALSyncOptions {
    saveToVault?: boolean;
    storageConfig?: StorageConfig;
}

/**
 * Sync options for MyAnimeList
 */
export interface MALSyncOptions {
    syncAnime?: boolean;
    syncManga?: boolean;
    animeStatuses?: string[];
    mangaStatuses?: string[];
}
