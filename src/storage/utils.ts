import { findFilesByMyAnimeNotesSync, type MyAnimeNotesIndex } from "../core";
import type { FileLookupResult, SkipCheckResult } from "./types";

// ============================================================================
// OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Yields to UI thread to prevent freezing
 * Uses requestAnimationFrame for better performance than setTimeout
 *
 * Calls requestAnimationFrame twice:
 * - First call: returns when browser is ready to paint
 * - Second call: ensures any pending paints are flushed
 */
export function yieldToUI(): Promise<void> {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}

/**
 * Gets synced timestamp using FAST cache-first approach
 * NO delays, NO fallbacks - trusts cache immediately
 *
 * The cache is reliable in practice. The rare edge case of stale cache
 * is acceptable vs 25 seconds of wasted time per batch.
 *
 * @returns Synced timestamp or undefined if not found
 */
export function getSyncedTimestampFast(
    cache: { frontmatter?: Record<string, unknown> } | undefined
): string | undefined {
    // Fast path: if cache exists and has synced timestamp, return it immediately
    if (
        cache?.frontmatter?.synced &&
        typeof cache.frontmatter.synced === "string"
    ) {
        return cache.frontmatter.synced;
    }

    // No timestamp found - return undefined (will update to be safe)
    return undefined;
}

/**
 * Pure computation: determines if file should be skipped
 * No I/O, no delays - just timestamp comparison
 *
 * @returns Skip decision with reason for logging
 */
export function shouldSkipByTimestamp(
    localSynced: string | undefined,
    remoteSynced: string | undefined,
    forceSync: boolean
): SkipCheckResult {
    // Force sync always updates
    if (forceSync) {
        return { skip: false, reason: "force sync enabled" };
    }

    // No local timestamp means new/ file - always update
    if (!localSynced) {
        return { skip: false, reason: "no local timestamp" };
    }

    // No remote timestamp - always update to be safe
    if (!remoteSynced) {
        return { skip: false, reason: "no remote timestamp" };
    }

    // Parse timestamps
    const localTime = new Date(localSynced).getTime();
    const remoteTime = new Date(remoteSynced).getTime();

    // Invalid timestamps - update to be safe
    if (isNaN(localTime) || isNaN(remoteTime)) {
        return { skip: false, reason: "invalid timestamp format" };
    }

    // Timestamps match - SKIP!
    if (localTime === remoteTime) {
        return { skip: true, reason: "timestamps match" };
    }

    // Timestamps differ - update needed
    return { skip: false, reason: "timestamps differ" };
}

// ============================================================================
// FILE LOOKUP
// ============================================================================

/**
 * Performs file lookup using myanimenotes strategies
 */
export function lookupExistingFiles(
    index: MyAnimeNotesIndex,
    myanimenotesSync: string
): FileLookupResult {
    // Simple Map lookup - no async, no complexity
    const matchingFiles = findFilesByMyAnimeNotesSync(index, myanimenotesSync);

    if (matchingFiles.length > 1) {
        return { type: "duplicates", files: matchingFiles };
    }

    if (matchingFiles.length === 1) {
        return { type: "exact", files: matchingFiles };
    }

    return { type: "none", files: [] };
}
