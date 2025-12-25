/**
 * Batching Strategy: Pre-Computation & Optimization
 *
 * Implements a "Split-Phase" processing strategy for batch operations:
 * 1. Analysis Phase (Synchronous): Reads all necessary state from memory and makes decisions.
 * 2. Execution Phase (Asynchronous): Performs the actual I/O based on Phase 1 results.
 *
 * This separation allows for "Fast-Path" optimizations (skipping IO entirely) and
 * prevents long-running loops from blocking the UI during decision making.
 */

import type MyAnimeNotesPlugin from "../main";
import type { MediaItem } from "../models";
import { generateMyAnimeNotesSync, type MyAnimeNotesIndex } from "../core";
import { logger } from "../utils/logger";
import type { BatchItem, StorageConfig, SyncActionResult } from "./types";
import {
    getSyncedTimestampFast,
    lookupExistingFiles,
    shouldSkipByTimestamp
} from "./utils";

const log = new logger("StorageBatching");

// ============================================================================
// ANALYSIS PHASE
// ============================================================================

/**
 * Synchronously analyzes a batch of items to determine processing actions.
 *
 * Performs pure in-memory computations:
 * 1. Resolves 'myanimenotes' identifiers.
 * 2. Queries the JIT Index for existing files.
 * 3. Reads MetadataCache to retrieve timestamps.
 * 4. Computes "Skip" vs "Update" decisions based on data freshness.
 *
 * @param plugin - Plugin instance (access to MetadataCache).
 * @param items - Raw media items from source.
 * @param config - Storage configuration.
 * @param folderPath - Target directory path.
 * @param index - JIT Index snapshot.
 * @returns Array of enriched BatchItems with pre-calculated decisions.
 */
export function prepareBatchItems(
    plugin: MyAnimeNotesPlugin,
    items: MediaItem[],
    config: StorageConfig,
    folderPath: string,
    index: MyAnimeNotesIndex
): BatchItem[] {
    const { metadataCache } = plugin.app;
    const startTime = Date.now();

    const batchItems: BatchItem[] = [];

    log.debug(`Batch Analysis: Processing ${items.length} items...`);

    // --- Sub-Phase 1: State Resolution ---
    // Resolve all identifiers and retrieve current file state from cache.

    for (const item of items) {
        const myanimenotes = generateMyAnimeNotesSync(item);
        const lookup = lookupExistingFiles(index, myanimenotes);

        // Optimistically retrieve timestamp if file exists (No disk I/O)
        let cachedTimestamp: string | undefined;
        if (lookup.files.length > 0) {
            const file = lookup.files[0];
            const cache = metadataCache.getFileCache(file);
            cachedTimestamp = cache ? getSyncedTimestampFast(cache) : undefined;
        }

        batchItems.push({
            item,
            myanimenotesSync: myanimenotes,
            cachedTimestamp,
            lookup,
            shouldSkip: false, // Placeholder, computed below
            skipReason: undefined
        });
    }

    // --- Sub-Phase 2: Decision Logic ---
    // Apply business logic to determine if an update is required.

    for (const batch of batchItems) {
        const decision = shouldSkipByTimestamp(
            batch.cachedTimestamp,
            batch.item.updatedAt,
            plugin.settings.forceFullSync
        );

        batch.shouldSkip = decision.skip;
        batch.skipReason = decision.reason;
    }

    // --- Metrics ---

    const duration = Date.now() - startTime;
    const skipCount = batchItems.filter(b => b.shouldSkip).length;

    log.debug(
        `Batch Analysis Complete (${duration}ms): ` +
            `${items.length} total, ${skipCount} skipped, ${
                items.length - skipCount
            } to process.`
    );

    return batchItems;
}

// ============================================================================
// RESULT GENERATION
// ============================================================================

/**
 * Generates result objects for skipped items without performing I/O.
 * Used to immediately resolve "Fast-Path" items in the batch processor.
 *
 * @param skippedItems - Subset of BatchItems marked for skipping.
 * @returns Array of SyncActionResults (Status: 'skipped').
 */
export function createSkipResults(
    skippedItems: BatchItem[]
): SyncActionResult[] {
    return skippedItems.map(batch => ({
        action: "skipped",
        filePath: batch.lookup.files[0]?.path || "",
        myanimenotesSync: batch.myanimenotesSync,
        message: `Skipped - ${batch.skipReason}`
    }));
}
