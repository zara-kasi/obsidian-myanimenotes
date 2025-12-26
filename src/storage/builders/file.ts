/**
 * File Utilities
 *
 * Helper functions for file operations, path handling.
 * Provides robust methods for ensuring directory existence and generating safe filenames
 * within the Obsidian vault environment.
 */

import type MyAnimeNotesPlugin from "../../main";
import { logger } from "../../utils/logger";
import { normalizePath } from "obsidian";
import type { Vault } from "obsidian";

const log = new logger("StorageFileUtils");

/**
 * Ensures a folder exists, creating it recursively if necessary.
 * Normalizes the path before checking/creating to ensure cross-platform compatibility.
 *
 * @param plugin - The plugin instance (provides access to the Vault API).
 * @param folderPath - The string path of the folder to check (e.g., "Media/Anime").
 * @returns A Promise that resolves when the folder is confirmed to exist.
 */
export async function ensureFolderExists(
    plugin: MyAnimeNotesPlugin,
    folderPath: string
): Promise<void> {
    const { vault } = plugin.app;
    // Normalize the folder path to handle cross-platform paths (e.g., convert backslashes to slashes)
    const normalizedPath = normalizePath(folderPath);

    // Check if the abstract file at this path already exists
    const folder = vault.getAbstractFileByPath(normalizedPath);

    if (!folder) {
        // If it doesn't exist, create it.
        // Note: createFolder in Obsidian API handles recursive creation if needed.
        await vault.createFolder(normalizedPath);
        log.debug(`Created folder: ${normalizedPath}`);
    }
}

/**
 * Sanitizes and validates a filename for use in Obsidian.
 * Strips illegal characters, handles whitespace, and enforces length limits.
 *
 * Logic:
 * 1. Removes file extension temporarily.
 * 2. Replaces illegal chars (Obsidian specific: #, ^, [, ], |) with hyphens.
 * 3. Collapses multiple spaces into one.
 * 4. Provides a fallback for empty names ("Untitled").
 * 5. Truncates to 200 chars to avoid filesystem errors.
 *
 * @param filename - The raw filename (with or without extension).
 * @returns A clean, safe string ready for use as a filename (without extension).
 */
export function sanitizeFilename(filename: string): string {
    // Remove extension to sanitize the base name only
    const withoutExt = filename.replace(/\.md$/i, "");

    let sanitized = normalizePath(withoutExt)
        .replace(/[#^[\]|]/g, "-") // Replace Obsidian linking chars with hyphen
        .replace(/\s+/g, " ")       // Collapse whitespace
        .trim();

    // Fallback for empty names or relative path edge cases
    if (!sanitized || sanitized === "." || sanitized === "..") {
        sanitized = "Untitled";
    }

    // Conservative length limit (Windows typically maxes at 260 for full paths)
    if (sanitized.length > 200) {
        sanitized = sanitized.substring(0, 200).trim();
    }

    return sanitized;
}

/**
 * Generates a unique filename if a naming collision occurs.
 * Checks the vault for existing files and appends a numeric suffix
 * (e.g., "Title.md" -> "Title-1.md") until a unique slot is found.
 *
 * @param plugin - Plugin instance.
 * @param vault - The Obsidian Vault object.
 * @param folderPath - The directory where the file will be placed.
 * @param baseFilename - The desired filename (including .md extension).
 * @returns A unique filename string (including .md extension).
 */
export function generateUniqueFilename(
    plugin: MyAnimeNotesPlugin,
    vault: Vault,
    folderPath: string,
    baseFilename: string
): string {
    // Normalize the folder path to ensure accurate lookups
    const normalizedFolderPath = normalizePath(folderPath);

    let filename = baseFilename;
    let counter = 1;

    // Collision Detection Loop:
    // Check if file exists at normalized path. If yes, increment counter and try again.
    while (
        vault.getAbstractFileByPath(
            normalizePath(`${normalizedFolderPath}/${filename}`)
        )
    ) {
        // Strip extension, append suffix, re-add extension
        const namePart = baseFilename.replace(/\.md$/, "");
        filename = `${namePart}-${counter}.md`;
        counter++;
    }

    if (counter > 1) {
        log.debug(`Generated unique filename: ${filename}`);
    }

    return filename;
}
