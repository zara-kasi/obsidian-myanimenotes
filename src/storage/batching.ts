import type MyAnimeNotesPlugin from "../main";
import type { UniversalMediaItem } from "../transformers";
import { generateMyAnimeNotesSync, type MyAnimeNotesIndex } from "../core";
import { log } from "../utils";
import type { BatchItem, StorageConfig, SyncActionResult } from "./types";
import {
    getSyncedTimestampFast,
    lookupExistingFiles,
    shouldSkipByTimestamp
} from "./utils";

// ============================================================================
// BATCH PREPARATION PHASE
// ============================================================================

/**
 * Prepares batch items by:
 * 1. Reading ALL metadata caches upfront (no delays)
 * 2. Performing ALL skip decisions in memory (pure computation)
 * 3. Creating enriched batch items with pre-computed decisions
 *
 * This phase runs quickly (< 100ms for 500 items) and determines
 * exactly which items to process before any file I/O begins.
 *
 * @returns Array of batch items with computed decisions
 */
export async function prepareBatchItems(
    plugin: MyAnimeNotesPlugin,
    items: UniversalMediaItem[],
    config: StorageConfig,
    folderPath: string,
    index: MyAnimeNotesIndex
): Promise<BatchItem[]> {
    const debug = log.createSub("Storage");
    const { metadataCache } = plugin.app;
    const startTime = Date.now();

    const batchItems: BatchItem[] = [];

    // Phase 1: Generate myanimenotes and read cache for all items upfront
    debug.info(
        `Batch prep phase 1: Reading cache for ${items.length} items...`
    );

    const cacheMap = new Map<string, string | undefined>();

    for (const item of items) {
        const myanimenotes = generateMyAnimeNotesSync(item);

        const lookup = lookupExistingFiles(index, myanimenotes);

        // For exact/duplicates/ matches, get cache immediately
        let cachedTimestamp: string | undefined;
        if (lookup.files.length > 0) {
            const file = lookup.files[0];
            const cache = metadataCache.getFileCache(file);
            cachedTimestamp = cache ? getSyncedTimestampFast(cache) : undefined;
            cacheMap.set(myanimenotes, cachedTimestamp);
        }

        batchItems.push({
            item,
            myanimenotesSync: myanimenotes,
            cachedTimestamp,
            lookup,
            shouldSkip: false, // Will compute in phase 2
            skipReason: undefined
        });
    }

    debug.info(
        `[Storage] Batch prep phase 1 complete: ${Date.now() - startTime}ms`
    );

    // Phase 2: Compute skip decisions (pure memory computation)
    debug.info(`[Storage] Batch prep phase 2: Computing skip decisions...`);
    const phase2Start = Date.now();

    for (const batch of batchItems) {
        const skipResult = shouldSkipByTimestamp(
            batch.cachedTimestamp,
            batch.item.updatedAt,
            plugin.settings.forceFullSync
        );

        batch.shouldSkip = skipResult.skip;
        batch.skipReason = skipResult.reason;
    }

    debug.info(
        `[Storage] Batch prep phase 2 complete: ${Date.now() - phase2Start}ms`
    );

    // Summary stats
    const skipCount = batchItems.filter(b => b.shouldSkip).length;
    const processCount = batchItems.length - skipCount;

    debug.info(
        `[Storage] Batch prep complete: ${items.length} items analyzed, ` +
            `${skipCount} to skip, ${processCount} to process (${
                Date.now() - startTime
            }ms total)`
    );

    return batchItems;
}

// ============================================================================
// SKIP FAST-PATH
// ============================================================================

/**
 * Records all skipped items as results without any file I/O
 * This completes instantly (< 1ms for 500 items) since there's no disk access
 *
 * @returns Array of skipped results
 */
export function createSkipResults(skippedItems: BatchItem[]): SyncActionResult[] {
    return skippedItems.map(batch => ({
        action: "skipped",
        filePath: batch.lookup.files[0]?.path || "",
        myanimenotesSync: batch.myanimenotesSync,
        message: `Skipped - ${batch.skipReason}`
    }));
}
