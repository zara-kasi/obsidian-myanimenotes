import type MyAnimeNotesPlugin from "../main";
import type { UniversalMediaItem } from "../transformers";
import { MediaCategory } from "../transformers";
import type { SyncResult, SyncItemResult, MALSyncOptions } from "./types";
import { isAuthenticated } from "../auth";
import { log, showNotice } from "../utils";
import { DEFAULT_SYNC_OPTIONS } from "./constants";
import { syncAnimeList, syncMangaList } from "./fetchers";

/**
 * Main sync function for MAL
 * @param plugin Plugin instance
 * @param options Sync options
 * @returns Sync result with all synced items
 */
export async function syncMAL(
    plugin: MyAnimeNotesPlugin,
    options: MALSyncOptions = DEFAULT_SYNC_OPTIONS
): Promise<{ items: UniversalMediaItem[]; result: SyncResult }> {
    const debug = log.createSub("MALSync");
    const startTime = Date.now();

    const allItems: UniversalMediaItem[] = [];
    const results: SyncItemResult[] = [];
    const errors: string[] = [];

    try {
        // Check authentication
        if (!isAuthenticated(plugin)) {
            throw new Error("Not authenticated with MyAnimeList");
        }

        showNotice(plugin, "Starting MAL sync...", 1000);

        // Sync anime if enabled
        if (options.syncAnime !== false) {
            try {
                const animeItems = await syncAnimeList(
                    plugin,
                    options.animeStatuses
                );
                allItems.push(...animeItems);

                // Create success results for each item
                animeItems.forEach(item => {
                    results.push({
                        id: item.id,
                        title: item.title,
                        success: true,
                        action: "updated"
                    });
                });
            } catch (error) {
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                const errorMsg = `Failed to sync anime: ${errorMessage}`;
                debug.error(errorMsg);
                errors.push(errorMsg);

                showNotice(plugin, `❌ ${errorMsg}`, 5000);
            }
        }

        // Sync manga if enabled
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
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                const errorMsg = `Failed to sync manga: ${errorMessage}`;
                debug.error(errorMsg);
                errors.push(errorMsg);

                showNotice(plugin, `❌ ${errorMsg}`, 5000);
            }
        }

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

        if (!syncResult.success) {
            showNotice(
                plugin,
                `⚠️ MAL sync completed with ${errors.length} errors`,
                4000
            );
        }

        debug.info("Sync completed:", syncResult);

        return { items: allItems, result: syncResult };
    } catch (error) {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        const errorMsg = `MAL sync failed: ${errorMessage}`;
        debug.error(errorMsg);
        errors.push(errorMsg);

        showNotice(plugin, `❌ ${errorMsg}`, 5000);

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
 * Quick sync for specific category
 * @param plugin Plugin instance
 * @param category anime or manga
 * @returns Synced items
 */
export async function quickSyncMAL(
    plugin: MyAnimeNotesPlugin,
    category: MediaCategory
): Promise<UniversalMediaItem[]> {
    const options: MALSyncOptions = {
        syncAnime: category === MediaCategory.ANIME,
        syncManga: category === MediaCategory.MANGA
    };

    const { items } = await syncMAL(plugin, options);
    return items;
}
