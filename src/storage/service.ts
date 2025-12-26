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
 * This function wraps the operation in a `lockManager` transaction. This is critical
 * to prevent race conditions when multiple processes (or rapid-fire events) attempt
 * to modify the same file simultaneously.
 *
 * Logic Flow:
 * 1. Generates the unique `myanimenotesSync` identifier.
 * 2. Acquires a named lock for that identifier.
 * 3. Builds a Just-In-Time (JIT) index of the vault to check for existing files.
 * 4. Routes execution to specific handlers (Create, Update, or Duplicate resolution).
 *
 * @param plugin - The main plugin instance, used to access the Vault and settings.
 * @param item - The specific media item (Anime/Manga) data to save.
 * @param config - The user's storage configuration (folders, overwriting rules, etc.).
 * @returns A Promise resolving to the action result (Created, Updated, or Skipped).
 * @throws Error if the Lock Manager is not initialized.
 */
export async function saveMediaItem(
    plugin: MyAnimeNotesPlugin,
    item: MediaItem,
    config: StorageConfig
): Promise<SyncActionResult> {
    const myanimenotesSync = generateMyAnimeNotesSync(item);

    log.debug(`Saving item: ${myanimenotesSync}`);

    // Safety check for the concurrency controller
    if (!plugin.lockManager) {
        throw new Error("Lock manager not initialized");
    }

    // Acquire lock for specific ID to ensure atomic write.
    // No other operation with this 'myanimenotesSync' ID can proceed until this block finishes.
    return await plugin.lockManager.withLock(myanimenotesSync, async () => {
        // Determine target folder based on category
        let folderPath =
            item.category === MediaCategory.ANIME
                ? config.animeFolder
                : config.mangaFolder;

        folderPath = normalizePath(folderPath);

        // Ensure the directory structure exists before writing
        if (config.createFolders) {
            await ensureFolderExists(plugin, folderPath);
        }

        // Build JIT index (Synchronous, O(1) lookup)
        // We rebuild this here to ensure we have the absolute latest state of the vault
        // inside this atomic transaction.
        const index = buildMyAnimeNotesIndex(plugin);

        // Check if the item already exists in the vault
        const lookup = lookupExistingFiles(index, myanimenotesSync);

        switch (lookup.type) {
            case "exact":
                // Single match found: Proceed to update or skip based on config
                return handleExactMatch(
                    plugin,
                    lookup.files[0],
                    item,
                    config,
                    myanimenotesSync
                );
            case "duplicates":
                // Multiple files found with same ID: User intervention or specific logic needed
                return handleDuplicates(
                    plugin,
                    lookup.files,
                    item,
                    config,
                    myanimenotesSync
                );

            case "none":
                // No match found: Create a brand new file
                return createNewFile(
                    plugin,
                    item,
                    config,
                    myanimenotesSync,
                    folderPath
                );
            default: {
                // TypeScript exhaustiveness check to ensure all cases are handled
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
 * High-Performance Batch Processing Engine.
 *
 * Orchestrates the synchronization of multiple media items. Implements a specific
 * two-phase architecture to maximize filesystem performance and keep the Obsidian UI
 * responsive during large syncs.
 *
 * Architecture:
 * 1. **PREPARATION PHASE (Read-Only)**:
 * - Builds a single JIT index for the *entire* batch (instead of once per item).
 * - Performs all logic checks (should skip? does file exist?) in memory.
 * - Identifies "Skip" targets immediately without touching the file system.
 *
 * 2. **EXECUTION PHASE (Write)**:
 * - Processes write operations sequentially.
 * - **Yielding**: Pauses execution every 10 items (`yieldToUI`) to let the main thread
 * render UI updates, preventing the "app freeze" common in large batch operations.
 * - Reports real-time progress via the callback.
 *
 * @param plugin - Plugin instance.
 * @param items - Array of MediaItems to process.
 * @param config - Storage configuration.
 * @param progressCallback - Optional hook for progress reporting (current, total, filename).
 * @returns A Promise resolving to an array of results for all processed items.
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
    // In this phase, we gather all necessary data to make decisions without writing to disk yet.

    let folderPath =
        items[0].category === MediaCategory.ANIME
            ? config.animeFolder
            : config.mangaFolder;

    folderPath = normalizePath(folderPath);

    // Create the folder once for the whole batch
    if (config.createFolders) {
        await ensureFolderExists(plugin, folderPath);
    }

    log.debug(`Building fresh JIT index for batch context...`);
    const indexStartTime = Date.now();

    // Synchronous index build - O(n) scan of vault once
    const index = buildMyAnimeNotesIndex(plugin);

    const indexDuration = Date.now() - indexStartTime;
    log.debug(`Index built: ${index.size} identifiers (${indexDuration}ms)`);

    log.debug(`Executing batch preparation strategy...`);
    const prepStartTime = Date.now();

    // Analyze all items against the index to determine actions (Create vs Update vs Skip)
    // This happens entirely in memory.
    const batchItems = prepareBatchItems(
        plugin,
        items,
        config,
        folderPath,
        index
    );

    const prepDuration = Date.now() - prepStartTime;
    log.debug(`Batch preparation complete: ${prepDuration}ms`);

    // Optimization: Filter out skipped items immediately to avoid the processing loop entirely.
    const results: SyncActionResult[] = [];
    const skippedItems = batchItems.filter(b => b.shouldSkip);
    const itemsToProcess = batchItems.filter(b => !b.shouldSkip);

    // Record skipped items immediately
    if (skippedItems.length > 0) {
        const skipResults = createSkipResults(skippedItems);
        results.push(...skipResults);
        log.debug(`Fast-path: Recorded ${skippedItems.length} skips (< 1ms)`);
    }

    // --- PHASE 2: EXECUTION ---
    // Perform actual file I/O operations for items that need it.

    log.debug(`Processing ${itemsToProcess.length} write operations...`);
    const processStartTime = Date.now();

    for (let i = 0; i < itemsToProcess.length; i++) {
        const batch = itemsToProcess[i];

        try {
            let result: SyncActionResult;

            // Route to appropriate handler based on the preparation analysis
            // Note: These handlers perform the actual file writing
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

            // Report progress to UI (e.g., Progress Bar Modal)
            if (progressCallback) {
                progressCallback(
                    i + 1,
                    itemsToProcess.length,
                    batch.item.title
                );
            }

            // Performance: Yield to UI thread every 10 ops to maintain responsiveness.
            // This prevents the "Window is not responding" warning during massive syncs.
            if ((i + 1) % 10 === 0) {
                await yieldToUI();
            }
        } catch (error) {
            // Log error but continue processing the rest of the batch
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
 * Helper: Saves mixed media items by category.
 *
 * Splits a mixed list (Anime + Manga) into separate queues and processes them
 * via the batch engine. This is necessary because Anime and Manga often map to
 * different folders in the user settings.
 *
 * @param plugin - Plugin instance.
 * @param items - The mixed list of MediaItems.
 * @param config - Storage configuration.
 * @param progressCallback - Progress reporting callback.
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

    // Segregate items
    const animeItems = items.filter(
        item => item.category === MediaCategory.ANIME
    );
    const mangaItems = items.filter(
        item => item.category === MediaCategory.MANGA
    );

    log.debug(
        `Category Segregation: ${animeItems.length} Anime, ${mangaItems.length} Manga`
    );

    // Process Anime Batch
    if (animeItems.length > 0) {
        const results = await saveMediaItems(
            plugin,
            animeItems,
            config,
            progressCallback
        );
        animePaths.push(...results.map(r => r.filePath));
    }

    // Process Manga Batch
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
