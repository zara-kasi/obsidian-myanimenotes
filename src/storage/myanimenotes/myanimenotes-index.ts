/**
 * MyAnimeNotes JIT (Just-In-Time) Index
 *
 * DESIGN PHILOSOPHY:
 * - Single function that captures vault state right now
 * - No classes, no methods, no state management
 * - Returns simple Map data structures
 * - Build -> Use -> Garbage collect
 *
 * USAGE:
 * ```typescript
 * const index = await buildMyAnimeNotesIndex(plugin);
 * const files = index.get(myanimenotes) || [];
 * // Done - let it garbage collect
 * ```
 */

import { TFile } from "obsidian";
import type MyAnimeNotesPlugin from "../../main";
import { createDebugLogger } from "../../utils";

/**
 * Index result: simple Map from myanimenotes -> files
 * No class, no methods, just data
 */
export type MyAnimeNotesIndex = Map<string, TFile[]>;

/**
 * Builds a fresh index of all myanimenotes in the vault RIGHT NOW
 * 
 * Scans every markdown file and extracts myanimenotes frontmatter.
 * Returns a simple Map for O(1) lookups.
 * 
 * @param plugin Plugin instance for vault access
 * @returns Map of myanimenotes identifier -> array of files
 * 
 * @example
 * const index = await buildMyAnimeNotesIndex(plugin);
 * const files = index.get("mal:anime:1245") || [];
 * console.log(`Found ${files.length} files`);
 */
export async function buildMyAnimeNotesIndex(
    plugin: MyAnimeNotesPlugin
): Promise<MyAnimeNotesIndex> {
    const debug = createDebugLogger(plugin, "JITIndex");
    const startTime = Date.now();

    const { vault, metadataCache } = plugin.app;
    const allFiles = vault.getMarkdownFiles();

    // Simple Map: myanimenotes -> files
    const index: MyAnimeNotesIndex = new Map();

    debug.log(`[JITIndex] Building index from ${allFiles.length} files...`);

    let filesWithMyAnimeNotes = 0;

    // Scan every markdown file
    for (const file of allFiles) {
        try {
            const cache = metadataCache.getFileCache(file);
            const myanimenotes = cache?.frontmatter?.myanimenotes;

            // Validate and add to index
            if (myanimenotes && typeof myanimenotes === "string") {
                if (!index.has(myanimenotes)) {
                    index.set(myanimenotes, []);
                }
                index.get(myanimenotes)!.push(file);
                filesWithMyAnimeNotes++;
            }
        } catch (error) {
            // Skip files that can't be read
            debug.log(`[JITIndex] Failed to read ${file.path}:`, error);
        }
    }

    const duration = Date.now() - startTime;

    // Calculate stats
    const uniqueIdentifiers = index.size;
    let duplicateCount = 0;
    for (const files of index.values()) {
        if (files.length > 1) {
            duplicateCount += files.length - 1;
        }
    }

    debug.log(
        `[JITIndex] Index built: ${allFiles.length} files scanned, ` +
            `${filesWithMyAnimeNotes} with myanimenotes, ` +
            `${uniqueIdentifiers} unique identifiers, ` +
            `${duplicateCount} duplicates, ` +
            `${duration}ms`
    );

    return index;
}

/**
 * Helper: Get files for a myanimenotes identifier
 * Just a convenience wrapper around Map.get()
 * 
 * @param index The index Map
 * @param myanimenotes The identifier to look up
 * @returns Array of files (empty if not found)
 */
export function getFilesFromIndex(
    index: MyAnimeNotesIndex,
    myanimenotes: string
): TFile[] {
    return index.get(myanimenotes) || [];
}

/**
 * Helper: Check if myanimenotes exists in index
 * 
 * @param index The index Map
 * @param myanimenotes The identifier to check
 * @returns true if identifier exists
 */
export function hasMyAnimeNotes(
    index: MyAnimeNotesIndex,
    myanimenotes: string
): boolean {
    return index.has(myanimenotes);
}

/**
 * Helper: Get index statistics
 * 
 * @param index The index Map
 * @returns Statistics object
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
            duplicates += files.length - 1;
        }
    }

    return {
        totalIdentifiers: index.size,
        totalFiles,
        duplicates
    };
}