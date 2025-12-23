import type { TFile } from "obsidian";
import type { UniversalMediaItem } from "../transformers";

// ============================================================================
// TYPES
// ============================================================================

export interface StorageConfig {
    animeFolder: string;
    mangaFolder: string;
    createFolders: boolean;
}

export interface SyncActionResult {
    action:
        | "created"
        | "updated"
        | "linked-legacy"
        | "duplicates-detected"
        | "skipped";
    filePath: string;
    myanimenotesSync: string;
    duplicatePaths?: string[];
    message?: string;
}

export interface FileLookupResult {
    type: "exact" | "duplicates" | "none";
    files: TFile[];
}

export interface SkipCheckResult {
    skip: boolean;
    reason?: string;
}

/**
 * Batch item with pre-computed decisions
 * Computed upfront during batch preparation phase
 */
export interface BatchItem {
    item: UniversalMediaItem;
    myanimenotesSync: string;
    cachedTimestamp: string | undefined;
    lookup: FileLookupResult;
    shouldSkip: boolean;
    skipReason?: string;
}

/**
 * Progress callback type
 */
export type ProgressCallback = (
    current: number,
    total: number,
    itemName: string
) => void;
