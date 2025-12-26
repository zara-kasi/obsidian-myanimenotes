/**
 * MyAnimeNotes Sync Manager - Identifier Logic
 *
 * Handles the generation, validation, and file lookup of the unique identifiers
 * used to link Obsidian notes to MyAnimeList entries.
 *
 * DESIGN PRINCIPLE:
 * - Pure functions (Stateless).
 * - All file lookups use the pre-built, in-memory index passed in (O(1) lookup).
 * - No background scanning or expensive I/O operations here.
 */

import { TFile } from "obsidian";
import type MyAnimeNotesPlugin from "../main";
import type { MediaItem } from "../models";
import type { MyAnimeNotesIndex } from "./indexing";
import { getFilesFromIndex } from "./indexing";
import { logger } from "../utils/logger";

const log = new logger("Identifier");

/**
 * Validates the strict format of the synchronization identifier.
 *
 * Format: `provider:category:id`
 * Example: `mal:anime:1245` or `mal:manga:2`
 *
 * Validation Rules:
 * - Provider: Must be "mal" (MyAnimeList).
 * - Category: Must be "anime" or "manga".
 * - ID: Must be a positive integer (no leading zeros).
 *
 * @param myanimenotesSync - The identifier string to test.
 * @returns `true` if the format is valid.
 */
export function validateMyAnimeNotesSyncFormat(
    myanimenotesSync: string
): boolean {
    const pattern = /^mal:(anime|manga):[1-9][0-9]*$/;
    return pattern.test(myanimenotesSync);
}

/**
 * Generates the canonical identifier string from a media item object.
 *
 * Normalizes input (lowercasing) to ensure consistency.
 *
 * @param item - The media item (Anime or Manga) to generate an ID for.
 * @returns A string in the format `mal:category:id`.
 * @throws {Error} If the generated format is invalid (e.g., negative ID).
 */
export function generateMyAnimeNotesSync(item: MediaItem): string {
    const provider = item.platform.toLowerCase();
    const category = item.category.toLowerCase();
    const id = String(item.id);

    const myanimenotesSync = `${provider}:${category}:${id}`;

    // Validate format immediately to catch bad data early
    if (!validateMyAnimeNotesSyncFormat(myanimenotesSync)) {
        throw new Error(
            `Invalid myanimenotes format generated: ${myanimenotesSync}`
        );
    }

    return myanimenotesSync;
}

/**
 * Finds all Obsidian files associated with a specific identifier using the JIT index.
 *
 * @param index - The pre-built snapshot index (see `indexing.ts`).
 * @param myanimenotesSync - The identifier to search for (e.g., "mal:anime:1").
 * @returns Array of TFiles that contain this identifier in their frontmatter.
 */
export function findFilesByMyAnimeNotesSync(
    index: MyAnimeNotesIndex,
    myanimenotesSync: string
): TFile[] {
    return getFilesFromIndex(index, myanimenotesSync);
}

/**
 * Deterministically selects the "best" file when multiple notes reference the same anime/manga.
 *
 * Conflict Resolution Strategy:
 * - **Recency Rule:** Returns the file with the most recent modification time (`mtime`).
 * - Assumption: The file the user touched last is likely the "primary" one they care about.
 *
 * @param plugin - Plugin instance (unused in logic but kept for interface consistency).
 * @param files - Array of candidate files.
 * @returns The single file selected as the primary sync target.
 * @throws {Error} If the input file array is empty.
 */
export function selectDeterministicFile(
    plugin: MyAnimeNotesPlugin,
    files: TFile[]
): TFile {
    if (files.length === 0) {
        throw new Error("No files provided for selection");
    }

    // Sort by mtime descending (most recent first)
    const sorted = [...files].sort((a, b) => b.stat.mtime - a.stat.mtime);

    log.debug(
        `Selected file from ${files.length} candidates: ${sorted[0].path} (most recent)`
    );
    return sorted[0];
}
