/**
 * Service Layer: Media Synchronization & Storage
 *
 * Orchestrates the persistence of MediaItems into the Obsidian vault.
 * Implements concurrency controls, batch optimization, and UI responsiveness strategies.
 */

import { normalizePath } from "obsidian";
import type MyAnimeNotesPlugin from "../main";
import type { MediaItem } from "../models";
import { MediaCategory } from "../models";
import { buildMyAnimeNotesIndex, generateMyAnimeNotesSync } from "../core";
import { ensureFolderExists } from "./builders";
import { logger } from "../utils/logger";
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

const log = new logger("StorageService");

// ============================================================================
// ATOMIC OPERATIONS
// ============================================================================

/**
 * Persists a single media item to the vault with concurrency safety.
 *
 * wraps the operation in a `lockManager` transaction to prevent race conditions
 * when multiple processes attempt to modify the same file simultaneously.
 *
 * @param plugin - Plugin instance.
 * @param item - The media item data to save.
 * @param config - User storage configuration.
 * @returns Promise resolving to the action result (Created, Updated, or Skipped).
 */
export async function saveMediaItem(
    plugin: MyAnimeNotesPlugin,
    item: MediaItem,
    config: StorageConfig
): Promise<SyncActionResult> {
    const myanimenotesSync = generateMyAnimeNotesSync(item);

    log.debug(`Saving item: ${myanimenotesSync}`);

    if (!plugin.lockManager) {
        throw new Error("Lock manager not initialized");
    }

    // Acquire lock for specific ID to ensure atomic write
    return await plugin.lockManager.withLock(myanimenotesSync, async () => {
        let folderPath =
            item.category === MediaCategory.ANIME
                ? config.animeFolder
                : config.mangaFolder;

        folderPath = normalizePath(folderPath);

        if (config.createFolders) {
            await ensureFolderExists(plugin, folderPath);
        }

        // Build JIT index (Synchronous, O(1) lookup)
        const index = buildMyAnimeNotesIndex(plugin);

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
// BATCH OPERATIONS
// ============================================================================

/**
 * High-Performance Batch Processing
 *
 * Orchestrates the synchronization of multiple media items. Implements a two-phase
 * architecture to maximize performance and UI responsiveness:
 *
 * 1. PREPARATION PHASE:
 * - Builds a single JIT index for the entire batch.
 * - Performs all read-only checks upfront.
 * - Identifies "Skip" targets immediately without touching the file system.
 *
 * 2. EXECUTION PHASE:
 * - Processes write operations sequentially.
 * - Yields to the main thread every 10 items to prevent UI freezing.
 * - Reports real-time progress via callback.
 *
 * @param plugin - Plugin instance.
 * @param items - Array of MediaItems to process.
 * @param config - Storage configuration.
 * @param progressCallback - Optional hook for progress reporting (1-100%).
 * @returns Promise resolving to an array of results.
 */
export async function saveMediaItems(
    plugin: MyAnimeNotesPlugin,
    items: MediaItem[],
    config: StorageConfig,
    progressCallback?: ProgressCallback
): Promise<SyncActionResult[]> {
    const startTime = Date.now();

    if (items.length === 0) {
        return [];
    }

    log.debug(`Batch save initialized: ${items.length} items`);

    // --- PHASE 1: PREPARATION ---

    let folderPath =
        items[0].category === MediaCategory.ANIME
            ? config.animeFolder
            : config.mangaFolder;

    folderPath = normalizePath(folderPath);

    if (config.createFolders) {
        await ensureFolderExists(plugin, folderPath);
    }

    log.debug(`Building fresh JIT index for batch context...`);
    const indexStartTime = Date.now();

    // Synchronous index build
    const index = buildMyAnimeNotesIndex(plugin);

    const indexDuration = Date.now() - indexStartTime;
    log.debug(`Index built: ${index.size} identifiers (${indexDuration}ms)`);

    log.debug(`Executing batch preparation strategy...`);
    const prepStartTime = Date.now();

    // Analyze all items against the index to determine actions
    const batchItems = prepareBatchItems(
        plugin,
        items,
        config,
        folderPath,
        index
    );

    const prepDuration = Date.now() - prepStartTime;
    log.debug(`Batch preparation complete: ${prepDuration}ms`);

    // Optimization: Filter out skipped items immediately to avoid processing loop
    const results: SyncActionResult[] = [];
    const skippedItems = batchItems.filter(b => b.shouldSkip);
    const itemsToProcess = batchItems.filter(b => !b.shouldSkip);

    if (skippedItems.length > 0) {
        const skipResults = createSkipResults(skippedItems);
        results.push(...skipResults);
        log.debug(`Fast-path: Recorded ${skippedItems.length} skips (< 1ms)`);
    }

    // --- PHASE 2: EXECUTION ---

    log.debug(`Processing ${itemsToProcess.length} write operations...`);
    const processStartTime = Date.now();

    for (let i = 0; i < itemsToProcess.length; i++) {
        const batch = itemsToProcess[i];

        try {
            let result: SyncActionResult;

            // Route to appropriate handler based on preparation analysis
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

            // Report progress
            if (progressCallback) {
                progressCallback(
                    i + 1,
                    itemsToProcess.length,
                    batch.item.title
                );
            }

            // Performance: Yield to UI thread every 10 ops to maintain responsiveness
            if ((i + 1) % 10 === 0) {
                await yieldToUI();
            }
        } catch (error) {
            log.error(`Failed to persist item ${batch.item.title}:`, error);
        }
    }

    const processDuration = Date.now() - processStartTime;
    const totalDuration = Date.now() - startTime;

    log.debug(
        `Batch operation completed. Total: ${totalDuration}ms ` +
            `(Prep: ${prepDuration}ms, Process: ${processDuration}ms). ` +
            `Results: ${results.length}`
    );

    return results;
}

/**
 * Splits a mixed media list into Anime and Manga categories and processes
 * them via the batch engine.
 *
 * @returns Object containing arrays of modified file paths for each category.
 */
export async function saveMediaItemsByCategory(
    plugin: MyAnimeNotesPlugin,
    items: MediaItem[],
    config: StorageConfig,
    progressCallback?: ProgressCallback
): Promise<{ anime: string[]; manga: string[] }> {
    const animePaths: string[] = [];
    const mangaPaths: string[] = [];

    const animeItems = items.filter(
        item => item.category === MediaCategory.ANIME
    );
    const mangaItems = items.filter(
        item => item.category === MediaCategory.MANGA
    );

    log.debug(
        `Category Segregation: ${animeItems.length} Anime, ${mangaItems.length} Manga`
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
