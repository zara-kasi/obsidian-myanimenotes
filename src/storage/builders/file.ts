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
 */
export async function ensureFolderExists(
    plugin: MyAnimeNotesPlugin,
    folderPath: string
): Promise<void> {
    const { vault } = plugin.app;
    const normalizedPath = normalizePath(folderPath);

    const folder = vault.getAbstractFileByPath(normalizedPath);

    if (!folder) {
        await vault.createFolder(normalizedPath);
        log.debug(`Created folder: ${normalizedPath}`);
    }
}

/**
 * Sanitizes and validates a filename for use in Obsidian.
 * Strips illegal characters, handles whitespace, and enforces length limits.
 */
export function sanitizeFilename(filename: string): string {
    // 1. Remove extension to sanitize the base name only
    const withoutExt = filename.replace(/\.md$/i, "");

    // 2. Normalize path separators first
    let sanitized = normalizePath(withoutExt);

    // 3. Replace ILLEGAL CHARACTERS with a hyphen
    // Regex explanation:
    // [\\/]  -> Backslash or Forward slash (directory separators)
    // :      -> Colon (drive letters/macOS/Windows illegal)
    // * -> Asterisk (wildcard)
    // ?      -> Question mark (wildcard)
    // "      -> Double quote
    // < >    -> Less/Greater than (redirects)
    // |      -> Pipe
    // # ^ [ ] -> Obsidian internal link characters
    sanitized = sanitized.replace(/[\\/:*?"<>|#^[\]]/g, "-");

    // 4. Collapse multiple spaces/hyphens into one for cleanliness
    sanitized = sanitized
        .replace(/\s+/g, " ")
        .replace(/-+/g, "-") // Prevent "Title---Subtitle"
        .trim();

    // 5. Fallback for empty names
    if (!sanitized || sanitized === "." || sanitized === "..") {
        sanitized = "Untitled";
    }

    // 6. Conservative length limit (Windows MAX_PATH issues)
    if (sanitized.length > 200) {
        sanitized = sanitized.substring(0, 200).trim();
    }

    return sanitized;
}

/**
 * Generates a unique filename if a naming collision occurs.
 * Checks the vault for existing files and appends a numeric suffix
 * (e.g., "Title.md" -> "Title-1.md") until a unique slot is found.
 */
export function generateUniqueFilename(
    plugin: MyAnimeNotesPlugin,
    vault: Vault,
    folderPath: string,
    baseFilename: string
): string {
    const normalizedFolderPath = normalizePath(folderPath);

    let filename = baseFilename;
    let counter = 1;

    // Collision Detection Loop
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
