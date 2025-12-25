/**
 * File Utilities
 *
 * Helper functions for file operations, path handling
 */

import type MyAnimeNotesPlugin from "../../main";
import { logger } from "../../utils/logger";
import { normalizePath } from "obsidian";
import type { Vault } from "obsidian";

const log = new logger("StorageFileUtils");

/**
 * Ensures a folder exists, creating it if necessary
 * Normalizes the path before checking/creating
 */

export async function ensureFolderExists(
    plugin: MyAnimeNotesPlugin,
    folderPath: string
): Promise<void> {
    const { vault } = plugin.app;
    // Normalize the folder path to handle cross-platform paths
    const normalizedPath = normalizePath(folderPath);

    const folder = vault.getAbstractFileByPath(normalizedPath);

    if (!folder) {
        await vault.createFolder(normalizedPath);
        log.debug(`Created folder: ${normalizedPath}`);
    }
}

/**
 * Sanitizes and validates filename for Obsidian
 */
export function sanitizeFilename(filename: string): string {
    const withoutExt = filename.replace(/\.md$/i, "");

    let sanitized = normalizePath(withoutExt)
        .replace(/[#^[\]|]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

    // Fallback for empty names
    if (!sanitized || sanitized === "." || sanitized === "..") {
        sanitized = "Untitled";
    }

    // Conservative length limit
    if (sanitized.length > 200) {
        sanitized = sanitized.substring(0, 200).trim();
    }

    return sanitized;
}

/**
 * Generates unique filename if collision occurs
 * Appends -1, -2, etc. until a unique name is found
 * Normalizes paths before checking
 */

export function generateUniqueFilename(
    plugin: MyAnimeNotesPlugin,
    vault: Vault,
    folderPath: string,
    baseFilename: string
): string {
    // Normalize the folder path
    const normalizedFolderPath = normalizePath(folderPath);

    let filename = baseFilename;
    let counter = 1;

    // Check if file exists at normalized path
    while (
        vault.getAbstractFileByPath(
            normalizePath(`${normalizedFolderPath}/${filename}`)
        )
    ) {
        const namePart = baseFilename.replace(/\.md$/, "");
        filename = `${namePart}-${counter}.md`;
        counter++;
    }

    if (counter > 1) {
        log.debug(`Generated unique filename: ${filename}`);
    }

    return filename;
}
