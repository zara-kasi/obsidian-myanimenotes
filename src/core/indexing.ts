/**
 * MyAnimeNotes JIT Indexing
 *
 * Provides a synchronous, stateless indexer for tracking 'myanimenotes' identifiers
 * across the Obsidian vault. Leverages Obsidian's internal MetadataCache for
 * high-performance O(1) lookups without persistent storage overhead.
 *
 * Usage:
 * ```ts
 * const index = buildMyAnimeNotesIndex(plugin);
 * const files = index.get("mal:anime:1234");
 * ```
 */

import { TFile } from "obsidian";
import type MyAnimeNotesPlugin from "../main";
import { logger } from "../utils/logger";

const log = new logger("FileIndex");

/**
 * Maps a unique 'myanimenotes' identifier (e.g., "mal:anime:123") to an array of Obsidian files.
 * Storing an array (TFile[]) enables implicit duplicate detection (one ID found in multiple files).
 */
export type MyAnimeNotesIndex = Map<string, TFile[]>;

/**
 * Synchronously builds a snapshot index of all tracked items in the vault.
 *
 * Performance Strategy:
 * - Utilizes the in-memory `MetadataCache` to scan file frontmatter instantly.
 * - Avoids expensive disk I/O (reading file contents).
 * - Designed to be instantiated, used for a specific operation (e.g., a Sync run),
 * and immediately garbage collected.
 *
 * @param plugin - Plugin instance for accessing Vault and MetadataCache.
 * @returns A Map linking identifiers to corresponding file objects.
 */
export function buildMyAnimeNotesIndex(
    plugin: MyAnimeNotesPlugin
): MyAnimeNotesIndex {
    const startTime = Date.now();
    const { vault, metadataCache } = plugin.app;

    const allFiles = vault.getMarkdownFiles();
    const index: MyAnimeNotesIndex = new Map();

    log.debug(`Building index from ${allFiles.length} files...`);

    let filesWithMyAnimeNotes = 0;

    // Scan every markdown file in the vault
    for (const file of allFiles) {
        try {
            // Retrieve cached frontmatter (instant access)
            const cache = metadataCache.getFileCache(file);
            const id = cache?.frontmatter?.myanimenotes as string | undefined;

            if (id && typeof id === "string") {
                // Initialize array if this is the first time seeing this ID
                const files = index.get(id) ?? [];
                files.push(file);

                // Update map
                index.set(id, files);
                filesWithMyAnimeNotes++;
            }
        } catch (error) {
            // Gracefully handle cache access errors without stopping the indexer
            log.error(`Failed to index file ${file.path}:`, error);
        }
    }

    // Performance and integrity logging
    const duration = Date.now() - startTime;
    const uniqueIdentifiers = index.size;
    let duplicateCount = 0;

    // Count how many IDs are associated with multiple files (duplicates)
    for (const files of index.values()) {
        if (files.length > 1) duplicateCount += files.length - 1;
    }

    log.debug(
        `Index built: ${allFiles.length} scanned, ` +
            `${filesWithMyAnimeNotes} tracked, ` +
            `${uniqueIdentifiers} unique IDs, ` +
            `${duplicateCount} duplicates ` +
            `(${duration}ms)`
    );

    return index;
}

/**
 * Retrieves all files associated with a specific identifier.
 *
 * @param index - The index snapshot.
 * @param myanimenotes - The identifier to look up.
 * @returns Array of TFiles (empty if identifier is not found).
 */
export function getFilesFromIndex(
    index: MyAnimeNotesIndex,
    myanimenotes: string
): TFile[] {
    return index.get(myanimenotes) || [];
}

/**
 * Checks for the existence of an identifier in the index.
 *
 * @param index - The index snapshot.
 * @param myanimenotes - The identifier to check.
 * @returns boolean indicating if the item exists in the vault.
 */
export function hasMyAnimeNotes(
    index: MyAnimeNotesIndex,
    myanimenotes: string
): boolean {
    return index.has(myanimenotes);
}

/**
 * Generates statistical data for the current index snapshot.
 * Useful for vault health checks and duplicate reporting.
 *
 * @param index - The index snapshot.
 */
export function getIndexStats(index: MyAnimeNotesIndex): {
    totalIdentifiers: number;
    totalFiles: number;
    duplicates: number;
} {
    let totalFiles = 0;
    let duplicates = 0;

    for (const files of index.values()) {
        totalFiles += files.length;
        if (files.length > 1) {
            // If an ID has 3 files, that counts as 2 duplicates
            duplicates += files.length - 1;
        }
    }

    return {
        totalIdentifiers: index.size,
        totalFiles,
        duplicates
    };
}
