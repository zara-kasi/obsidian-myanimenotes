import { findFilesByMyAnimeNotesSync, type MyAnimeNotesIndex } from "../core";
import type { FileLookupResult, SkipCheckResult } from "./types";

// ============================================================================
// OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Yields execution back to the browser's main UI thread to prevent the application
 * from freezing during long-running batch operations.
 *
 * Implementation Details:
 * Uses a double `requestAnimationFrame` pattern instead of `setTimeout(..., 0)`.
 * - First RAF: Queues the callback for the next paint frame.
 * - Second RAF: Ensures that the browser has actually painted the previous frame
 * before resuming execution. This guarantees visual updates (like progress bars)
 * actually render to the screen.
 *
 * @returns A Promise that resolves after the UI has had a chance to update.
 */
export function yieldToUI(): Promise<void> {
    return new Promise(resolve => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}

/**
 * Retrieves the 'synced' timestamp from a file's metadata cache.
 *
 * Strategy: "Fast-Fail Cache-First"
 * This function is designed for high-performance loops. It strictly trusts the
 * in-memory metadata cache provided by Obsidian. It does NOT fall back to reading
 * the file from disk (which would be 100x slower), accepting that in rare edge
 * cases the cache might be slightly stale.
 *
 * @param cache - The Obsidian file cache object (from `app.metadataCache`).
 * @returns The timestamp string if found, otherwise undefined.
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

    // No timestamp found - return undefined (will likely trigger an update to be safe)
    return undefined;
}

/**
 * Pure business logic to determine if a file update is necessary.
 * Compares local and remote timestamps to decide if an I/O operation can be skipped.
 *
 * Logic Priority:
 * 1. Force Sync -> Never skip.
 * 2. Missing Timestamps (Local or Remote) -> Never skip (safety first).
 * 3. Invalid Date Strings -> Never skip.
 * 4. Timestamps Match -> Skip.
 * 5. Timestamps Differ -> Update.
 *
 * @param localSynced - The timestamp currently in the local file's frontmatter.
 * @param remoteSynced - The 'updatedAt' timestamp from the MyAnimeList API.
 * @param forceSync - User setting to override optimization.
 * @returns A structured result containing the boolean decision and a reason string.
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

    // No local timestamp means new/legacy file - always update
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
    // This is the "Happy Path" for optimization where we save IO operations.
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
 * Locates existing files in the vault that match the given 'myanimenotes' Sync ID.
 * Standardizes the lookup result into a typed union for easier handling by the service layer.
 *
 * @param index - The JIT index of the vault.
 * @param myanimenotesSync - The unique identifier to search for.
 * @returns A FileLookupResult categorizing the find as 'exact', 'duplicates', or 'none'.
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
