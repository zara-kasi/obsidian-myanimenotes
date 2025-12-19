/**
 * File Utilities
 *
 * Helper functions for file operations, path handling
 * Uses Obsidian's native API for safe, cross-platform file handling
 */

import type MyAnimeNotesPlugin from "../main";
import { createDebugLogger } from "../utils";
import { normalizePath, sanitizeFileName, TFolder } from "obsidian";
import type { Vault } from "obsidian";

/**
 * Ensures a folder exists, creating it recursively if necessary
 * Normalizes the path before checking/creating
 *
 * Note: vault.createFolder is not recursive. For nested paths like "Anime/2024/Winter"
 * where parent folders don't exist, we must create them level by level.
 */
export async function ensureFolderExists(
    plugin: MyAnimeNotesPlugin,
    folderPath: string
): Promise<void> {
    const debug = createDebugLogger(plugin, "FileUtils");
    const { vault } = plugin.app;

    // Normalize the folder path to handle cross-platform paths
    const normalizedPath = normalizePath(folderPath);

    // Check if folder already exists
    const existing = vault.getAbstractFileByPath(normalizedPath);
    if (existing instanceof TFolder) {
        return; // Folder already exists
    }

    // Split path into segments and create each level
    const segments = normalizedPath.split("/").filter(seg => seg.length > 0);
    let currentPath = "";

    for (const segment of segments) {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;

        // Check if this level exists and is a folder
        const exists = vault.getAbstractFileByPath(currentPath);

        if (exists instanceof TFolder) {
            // Already a folder, continue
            continue;
        } else if (exists) {
            // Path exists but is a file, not a folder - this is a conflict
            throw new Error(
                `Cannot create folder "${currentPath}": a file with this name already exists`
            );
        }

        // Path doesn't exist, create the folder
        try {
            await vault.createFolder(currentPath);
            debug.log(`[FileUtils] Created folder: ${currentPath}`);
        } catch (error) {
            // Folder might have been created by another operation
            // Check again before throwing
            const folderCheck = vault.getAbstractFileByPath(currentPath);
            if (!(folderCheck instanceof TFolder)) {
                throw error;
            }
        }
    }
}

/**
 * Sanitizes a filename using Obsidian's native sanitizer
 *
 * Handles:
 * - Invalid characters (/, \, :, *, ?, ", <, >, |)
 * - Whitespace trimming
 * - Cross-platform compatibility
 *
 * @param filename The filename to sanitize (with or without .md extension)
 * @returns Sanitized filename that's safe for all platforms
 */
export function sanitizeFilename(filename: string): string {
    // Remove .md extension temporarily
    let name = filename.replace(/\.md$/i, "");

    // Use Obsidian's native sanitizer
    name = sanitizeFileName(name);

    // Handle empty filename after sanitization
    if (name.length === 0) {
        name = "untitled";
    }

    // Add .md extension back
    return `${name}.md`;
}

/**
 * Generates unique filename if collision occurs using Obsidian's native method
 *
 * Uses vault.getAvailablePath() which automatically appends numbers
 * (e.g., "file 1.md", "file 2.md") to avoid collisions, matching Obsidian's
 * native behavior when creating files.
 *
 * @param plugin Plugin instance
 * @param vault Vault instance
 * @param folderPath Folder where file will be created
 * @param baseFilename Base filename (should already be sanitized)
 * @returns Unique full path that doesn't conflict with existing files
 */
export function generateUniqueFilename(
    plugin: MyAnimeNotesPlugin,
    vault: Vault,
    folderPath: string,
    baseFilename: string
): string {
    const debug = createDebugLogger(plugin, "FileUtils");

    // Normalize the folder path
    const normalizedFolderPath = normalizePath(folderPath);

    // Remove .md extension (getAvailablePath adds it back)
    const fileNameNoExt = baseFilename.replace(/\.md$/i, "");

    // Construct base path, avoiding leading slash for root vault files
    const basePath = normalizedFolderPath
        ? `${normalizedFolderPath}/${fileNameNoExt}`
        : fileNameNoExt;

    // Use Obsidian's native collision detection
    // This returns a full path like "folder/filename.md" or "folder/filename 1.md"
    const uniquePath = vault.getAvailablePath(basePath, "md");

    // Extract just the filename from the full path
    const filename = uniquePath.split("/").pop() || baseFilename;

    if (filename !== baseFilename) {
        debug.log(`[FileUtils] Generated unique filename: ${filename}`);
    }

    return filename;
}

/**
 * Gets a unique file path (full path, not just filename)
 * Useful when you need the complete path for vault.create() operations
 *
 * @param vault Vault instance
 * @param folderPath Folder where file will be created
 * @param baseFilename Base filename (should already be sanitized)
 * @returns Full unique path ready for vault.create()
 */
export function getUniqueFilePath(
    vault: Vault,
    folderPath: string,
    baseFilename: string
): string {
    const normalizedFolder = normalizePath(folderPath);
    const fileNameNoExt = baseFilename.replace(/\.md$/i, "");

    // Construct base path, avoiding leading slash for root vault files
    const basePath = normalizedFolder
        ? `${normalizedFolder}/${fileNameNoExt}`
        : fileNameNoExt;

    // Returns full path: "folder/filename.md" or "folder/filename 1.md"
    return vault.getAvailablePath(basePath, "md");
}
