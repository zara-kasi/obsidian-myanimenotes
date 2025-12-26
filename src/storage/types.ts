import type { TFile } from "obsidian";
import type { MediaItem } from "../models";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuration options for the storage service.
 * Derived from the main plugin settings.
 */
export interface StorageConfig {
    /** Target folder path for Anime notes */
    animeFolder: string;
    /** Target folder path for Manga notes */
    mangaFolder: string;
    /** Whether to automatically create folders if they don't exist */
    createFolders: boolean;
}

/**
 * The result of a single synchronization operation.
 * Used for logging, UI feedback, and error tracking.
 */
export interface SyncActionResult {
    /** The specific action that was taken */
    action:
        | "created"              // New file created
        | "updated"              // Existing file frontmatter updated
        | "linked-legacy"        // (Deprecated) Legacy file linked
        | "duplicates-detected"  // Multiple files found, user intervention may be needed
        | "skipped";             // No changes needed (up-to-date)
    
    /** The absolute path of the primary file involved */
    filePath: string;
    
    /** The unique sync identifier for the media item */
    myanimenotesSync: string;
    
    /** If duplicates were found, lists all conflicting file paths */
    duplicatePaths?: string[];
    
    /** specific details about the operation (e.g., skip reason) */
    message?: string;
}

/**
 * Result of a file lookup operation in the vault.
 * strictly typed to ensure all cases (0, 1, or N files) are handled.
 */
export interface FileLookupResult {
    /**
     * 'exact': Exactly one file found (ideal state).
     * 'duplicates': Multiple files found (ambiguous state).
     * 'none': No files found (new creation needed).
     */
    type: "exact" | "duplicates" | "none";
    
    /** The array of matching TFile objects */
    files: TFile[];
}

/**
 * Result of the logic check for whether an item should be skipped.
 */
export interface SkipCheckResult {
    /** True if the item should NOT be processed */
    skip: boolean;
    /** Human-readable reason for skipping (e.g., "Timestamps match") */
    reason?: string;
}

/**
 * A "Pre-Computed" synchronization unit for batch processing.
 * * This interface holds all necessary state for a media item *before* any
 * file I/O occurs. It is populated during the "Analysis Phase" of the
 * batch strategy.
 */
export interface BatchItem {
    /** The raw media data from MyAnimeList */
    item: MediaItem;
    
    /** The computed unique sync identifier */
    myanimenotesSync: string;
    
    /** The 'updatedAt' timestamp retrieved from the Obsidian MetadataCache (if file exists) */
    cachedTimestamp: string | undefined;
    
    /** The result of the vault file lookup */
    lookup: FileLookupResult;
    
    /** * The final decision on whether to skip this item.
     * Computed by comparing `item.updatedAt` vs `cachedTimestamp`.
     */
    shouldSkip: boolean;
    
    /** Reason for skipping, if applicable */
    skipReason?: string;
}

/**
 * Callback function signature for reporting batch progress.
 * Used to update UI elements (e.g., Progress Bars).
 * * @param current - The number of items processed so far.
 * @param total - The total number of items in the batch.
 * @param itemName - The title of the item currently being processed.
 */
export type ProgressCallback = (
    current: number,
    total: number,
    itemName: string
) => void;
