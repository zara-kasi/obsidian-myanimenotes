import type MyAnimeNotesPlugin from "../main";
import type { MediaItem } from "../models";
import { MediaCategory } from "../models";
import type { SyncResult, SyncItemResult, MALSyncOptions } from "./types";
import { isAuthenticated } from "../auth/token";
import { showNotice } from "../utils/notice";
import { logger } from "../utils/logger";
import { DEFAULT_SYNC_OPTIONS } from "./constants";
import { syncAnimeList, syncMangaList } from "./fetchers";

const log = new logger("SyncService");

/**
 * Orchestrates the synchronization process with MyAnimeList.
 *
 * Responsibilities:
 * - Validates authentication state.
 * - Conditionally executes Anime and/or Manga fetchers based on options.
 * - Aggregates results and handles partial failures (e.g., Anime fails, but Manga succeeds).
 * - Generates execution statistics and user feedback notices.
 *
 * @param plugin - The main plugin instance.
 * @param options - Configuration for the sync (what to sync, specific statuses).
 * @returns A promise resolving to the list of fetched items and the execution result metrics.
 */
export async function syncMAL(
    plugin: MyAnimeNotesPlugin,
    options: MALSyncOptions = DEFAULT_SYNC_OPTIONS
): Promise<{ items: MediaItem[]; result: SyncResult }> {
    const startTime = Date.now();

    const allItems: MediaItem[] = [];
    const results: SyncItemResult[] = [];
    const errors: string[] = [];

    try {
        // Check authentication before attempting any API calls
        if (!isAuthenticated(plugin)) {
            throw new Error("Not authenticated with MyAnimeList");
        }

        showNotice("Starting MAL sync...", 2000);

        // --- PHASE 1: Sync Anime (if enabled) ---
        if (options.syncAnime !== false) {
            try {
                const animeItems = await syncAnimeList(
                    plugin,
                    options.animeStatuses
                );
                allItems.push(...animeItems);

                // Create success results for each item to track stats
                animeItems.forEach(item => {
                    results.push({
                        id: item.id,
                        title: item.title,
                        success: true,
                        action: "updated"
                    });
                });
            } catch (error) {
                // Graceful degradation: If anime fails, log it but allow Manga to attempt syncing.
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                const errorMsg = `Failed to sync anime: ${errorMessage}`;

                // Log detailed error but don't show user notice yet (aggregated at the end)
                log.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        // --- PHASE 2: Sync Manga (if enabled) ---
        if (options.syncManga !== false) {
            try {
                const mangaItems = await syncMangaList(
                    plugin,
                    options.mangaStatuses
                );
                allItems.push(...mangaItems);

                // Create success results for each item
                mangaItems.forEach(item => {
                    results.push({
                        id: item.id,
                        title: item.title,
                        success: true,
                        action: "updated"
                    });
                });
            } catch (error) {
                // Graceful degradation: If manga fails, record it but preserve any Anime success.
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                const errorMsg = `Failed to sync manga: ${errorMessage}`;

                // Log detailed error but don't show user notice yet
                log.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        // --- PHASE 3: Result Aggregation ---
        const endTime = Date.now();
        const syncResult: SyncResult = {
            success: errors.length === 0,
            itemsProcessed: results.length,
            itemsSucceeded: results.filter(r => r.success).length,
            itemsFailed: results.filter(r => !r.success).length,
            results,
            errors,
            startTime,
            endTime
        };

        // --- ERROR HANDLING NOTICES ---
        if (!syncResult.success) {
            const hasSuccess = syncResult.itemsSucceeded > 0;

            if (!hasSuccess) {
                // Scenario 1: Total Failure (Both failed, or the only requested one failed)
                showNotice("MAL Sync failed", "warning", 5000);
            } else {
                // Scenario 2: Partial Failure (One succeeded, one failed)
                // We still returned the successful items, so we warn the user about the partial error.
                showNotice("MAL Sync completed with errors", "warning", 4000);
            }
        }

        log.debug("Sync completed:", syncResult);

        return { items: allItems, result: syncResult };
    } catch (error) {
        // --- CRITICAL FAILURE ---
        // Catches strictly global errors (e.g., Auth failure) that prevent ANY sync from starting.
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        const errorMsg = `MAL sync failed: ${errorMessage}`;

        log.error(errorMsg);
        errors.push(errorMsg);

        // Show generic failure notice for critical errors
        showNotice("MAL Sync failed", "warning", 5000);

        const endTime = Date.now();
        const syncResult: SyncResult = {
            success: false,
            itemsProcessed: results.length,
            itemsSucceeded: results.filter(r => r.success).length,
            itemsFailed: results.filter(r => !r.success).length,
            results,
            errors,
            startTime,
            endTime
        };

        return { items: allItems, result: syncResult };
    }
}

/**
 * Convenience wrapper to perform a quick sync for a single category.
 * Automatically configures the options to disable the other category.
 *
 * @param plugin - The main plugin instance.
 * @param category - The specific category to sync (`anime` or `manga`).
 * @returns A promise resolving to the list of synced items.
 */
export async function quickSyncMAL(
    plugin: MyAnimeNotesPlugin,
    category: MediaCategory
): Promise<MediaItem[]> {
    const options: MALSyncOptions = {
        syncAnime: category === MediaCategory.ANIME,
        syncManga: category === MediaCategory.MANGA
    };

    const { items } = await syncMAL(plugin, options);
    return items;
}
