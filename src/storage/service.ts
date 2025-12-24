import { normalizePath } from "obsidian";
import type MyAnimeNotesPlugin from "../main";
import type { MediaItem } from "../models";
import { MediaCategory } from "../models";
import { buildMyAnimeNotesIndex, generateMyAnimeNotesSync } from "../core";
import { ensureFolderExists } from "./builders";
import { log } from "../utils";
import type {
    StorageConfig,
    SyncActionResult,
    ProgressCallback
} from "./types";
import { lookupExistingFiles, yieldToUI } from "./utils";
import {
    handleExactMatch,
    handleDuplicates,
    createNewFile
} from "./operations";
import { prepareBatchItems, createSkipResults } from "./batching";

// ============================================================================
// MAIN OPTIMIZED SAVE FUNCTION
// ============================================================================

/**
 * Single-item save with locking (backward compatible)
 * Kept for existing code that calls this directly
 */
export async function saveMediaItem(
    plugin: MyAnimeNotesPlugin,
    item: MediaItem,
    config: StorageConfig
): Promise<SyncActionResult> {
    const debug = log.createSub("Storage");
    const myanimenotesSync = generateMyAnimeNotesSync(item);

    debug.info(`Saving item: ${myanimenotesSync}`);

    if (!plugin.lockManager) {
        throw new Error("Lock manager not initialized");
    }

    // Single-item operations use lock for safety
    return await plugin.lockManager.withLock(myanimenotesSync, async () => {
        let folderPath =
            item.category === MediaCategory.ANIME
                ? config.animeFolder
                : config.mangaFolder;

        folderPath = normalizePath(folderPath);

        if (config.createFolders) {
            await ensureFolderExists(plugin, folderPath);
        }

        // Build fresh index for single-item operation
        const index = await buildMyAnimeNotesIndex(plugin);

        const lookup = lookupExistingFiles(index, myanimenotesSync);

        switch (lookup.type) {
            case "exact":
                return handleExactMatch(
                    plugin,
                    lookup.files[0],
                    item,
                    config,
                    myanimenotesSync
                );
            case "duplicates":
                return handleDuplicates(
                    plugin,
                    lookup.files,
                    item,
                    config,
                    myanimenotesSync
                );

            case "none":
                return createNewFile(
                    plugin,
                    item,
                    config,
                    myanimenotesSync,
                    folderPath
                );
            default: {
                const exhaustiveCheck: never = lookup.type;
                throw new Error(
                    `Unknown lookup type: ${String(exhaustiveCheck)}`
                );
            }
        }
    });
}

// ============================================================================
// OPTIMIZED BATCH OPERATIONS
// ============================================================================

/**
 * OPTIMIZED batch save with:
 * - Batch preparation phase (all cache reads + skip decisions upfront)
 * - Skip fast-path (instant recording of skips, no I/O)
 * - UI yielding every 10 items (prevents freezing)
 * - Progress callback for real-time feedback
 * - No per-item locks (sequential processing already safe)
 */

export async function saveMediaItems(
    plugin: MyAnimeNotesPlugin,
    items: MediaItem[],
    config: StorageConfig,
    progressCallback?: ProgressCallback
): Promise<SyncActionResult[]> {
    const debug = log.createSub("Storage");
    const startTime = Date.now();

    if (items.length === 0) {
        return [];
    }

    debug.info(`Batch save starting: ${items.length} items`);

    // PREPARE PHASE: Batch preparation (all cache reads + decisions upfront)
    let folderPath =
        items[0].category === MediaCategory.ANIME
            ? config.animeFolder
            : config.mangaFolder;

    folderPath = normalizePath(folderPath);

    if (config.createFolders) {
        await ensureFolderExists(plugin, folderPath);
    }

    // Build index before calling prepareBatchItems
    debug.info(`Building fresh myanimenotes index for batch...`);
    const indexStartTime = Date.now();
    const index = await buildMyAnimeNotesIndex(plugin);
    const indexDuration = Date.now() - indexStartTime;
    debug.info(`Index built: ${index.size} identifiers (${indexDuration}ms)`);

    debug.info(`Starting batch preparation phase...`);
    const prepStartTime = Date.now();

    // INDEX to prepareBatchItems
    const batchItems = await prepareBatchItems(
        plugin,
        items,
        config,
        folderPath,
        index
    );

    const prepDuration = Date.now() - prepStartTime;
    debug.info(`Batch preparation complete: ${prepDuration}ms`);

    // FAST-PATH: Record all skips instantly (no I/O)
    const results: SyncActionResult[] = [];
    const skippedItems = batchItems.filter(b => b.shouldSkip);
    const itemsToProcess = batchItems.filter(b => !b.shouldSkip);

    if (skippedItems.length > 0) {
        const skipResults = createSkipResults(skippedItems);
        results.push(...skipResults);
        debug.info(`Recorded ${skippedItems.length} skips (fast-path, < 1ms)`);
    }

    // PROCESS PHASE: Update items with UI yielding
    debug.info(`Processing ${itemsToProcess.length} items...`);
    const processStartTime = Date.now();

    for (let i = 0; i < itemsToProcess.length; i++) {
        const batch = itemsToProcess[i];

        try {
            let result: SyncActionResult;

            switch (batch.lookup.type) {
                case "exact":
                    result = await handleExactMatch(
                        plugin,
                        batch.lookup.files[0],
                        batch.item,
                        config,
                        batch.myanimenotesSync
                    );
                    break;

                case "duplicates":
                    result = await handleDuplicates(
                        plugin,
                        batch.lookup.files,
                        batch.item,
                        config,
                        batch.myanimenotesSync
                    );
                    break;

                case "none":
                    result = await createNewFile(
                        plugin,
                        batch.item,
                        config,
                        batch.myanimenotesSync,
                        folderPath
                    );
                    break;

                default: {
                    const exhaustiveCheck: never = batch.lookup.type;
                    throw new Error(
                        `Unknown lookup type: ${String(exhaustiveCheck)}`
                    );
                }
            }

            results.push(result);

            // Call progress callback after each item
            if (progressCallback) {
                progressCallback(
                    i + 1,
                    itemsToProcess.length,
                    batch.item.title
                );
            }

            // Yield to UI every 10 items to prevent freezing
            if ((i + 1) % 10 === 0) {
                await yieldToUI();
            }
        } catch (error) {
            debug.error(`Failed to save ${batch.item.title}:`, error);
        }
    }

    const processDuration = Date.now() - processStartTime;
    const totalDuration = Date.now() - startTime;

    debug.info(
        `Batch save complete: ${results.length} results ` +
            `(prep: ${prepDuration}ms, process: ${processDuration}ms, total: ${totalDuration}ms)`
    );

    return results;
}

/**
 * Category-based batch save with progress callback
 */
export async function saveMediaItemsByCategory(
    plugin: MyAnimeNotesPlugin,
    items: MediaItem[],
    config: StorageConfig,
    progressCallback?: ProgressCallback
): Promise<{ anime: string[]; manga: string[] }> {
    const debug = log.createSub("Storage");
    const animePaths: string[] = [];
    const mangaPaths: string[] = [];

    const animeItems = items.filter(
        item => item.category === MediaCategory.ANIME
    );
    const mangaItems = items.filter(
        item => item.category === MediaCategory.MANGA
    );

    debug.info(
        `Category split: ${animeItems.length} anime, ${mangaItems.length} manga`
    );

    if (animeItems.length > 0) {
        const results = await saveMediaItems(
            plugin,
            animeItems,
            config,
            progressCallback
        );
        animePaths.push(...results.map(r => r.filePath));
    }

    if (mangaItems.length > 0) {
        const results = await saveMediaItems(
            plugin,
            mangaItems,
            config,
            progressCallback
        );
        mangaPaths.push(...results.map(r => r.filePath));
    }

    return { anime: animePaths, manga: mangaPaths };
}
