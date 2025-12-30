/**
 * Storage Operations Module
 *
 * This module defines the concrete file system operations for the sync process.
 * It handles the specific logic for:
 * 1. Updating existing files (Exact Match).
 * 2. resolving duplicate conflicts (Duplicate Handling).
 * 3. Creating new media notes (File Creation) with collision detection.
 */

import { normalizePath, type TFile } from "obsidian";
import type MyAnimeNotesPlugin from "../main";
import type { MediaItem } from "../models";
import { MediaCategory } from "../models";
import {
    DEFAULT_ANIME_TEMPLATE,
    DEFAULT_MANGA_TEMPLATE
} from "../settings/template";
import { resolveTemplate } from "../settings/template/parser";
import {
    generateFrontmatterProperties,
    updateMarkdownFileFrontmatter,
    generateInitialFileContent
} from "./builders";
import {
    sanitizeFilename,
    generateUniqueFilename,
    ensureFolderExists
} from "./builders/file";
import { logger } from "../utils/logger";
import type { StorageConfig, SyncActionResult } from "./types";
import { selectDeterministicFile } from "../core";

const log = new logger("StorageOperations");

// ============================================================================
// FILE HANDLERS
// ============================================================================

/**
 * Handles the scenario where exactly one matching file exists in the vault.
 * Updates the existing file's frontmatter with the latest metadata from MyAnimeList.
 *
 * @param plugin - Plugin instance.
 * @param file - The specific TFile object found in the vault.
 * @param item - The new data from MyAnimeList.
 * @param config - Storage configuration (unused here, but kept for interface consistency).
 * @param myanimenotesSync - The unique sync identifier.
 * @returns Promise resolving to an 'updated' action result.
 */
export async function handleExactMatch(
    plugin: MyAnimeNotesPlugin,
    file: TFile,
    item: MediaItem,
    config: StorageConfig,
    myanimenotesSync: string
): Promise<SyncActionResult> {
    // Get template based on category (Anime vs Manga)
    const template =
        item.category === MediaCategory.ANIME
            ? plugin.settings.animeTemplate || DEFAULT_ANIME_TEMPLATE
            : plugin.settings.mangaTemplate || DEFAULT_MANGA_TEMPLATE;

    // Generate updated properties based on current settings and templates
    const frontmatterProps = generateFrontmatterProperties(
        plugin,
        item,
        template,
        myanimenotesSync
    );

    // Write updates to the file header
    await updateMarkdownFileFrontmatter(plugin, file, frontmatterProps);

    return {
        action: "updated",
        filePath: file.path,
        myanimenotesSync,
        message: `Updated ${file.path}`
    };
}

/**
 * Handles the scenario where multiple files match the same sync ID.
 * Uses a deterministic selection strategy to update the "best" candidate
 * and reports the others as duplicates.
 *
 * @param plugin - Plugin instance.
 * @param files - Array of matching TFile objects.
 * @param item - The new data from MyAnimeList.
 * @param config - Storage configuration.
 * @param myanimenotesSync - The unique sync identifier.
 * @returns Promise resolving to a 'duplicates-detected' action result.
 */
export async function handleDuplicates(
    plugin: MyAnimeNotesPlugin,
    files: TFile[],
    item: MediaItem,
    config: StorageConfig,
    myanimenotesSync: string
): Promise<SyncActionResult> {
    log.debug(
        `[Storage] Found ${files.length} files with myanimenotes: ${myanimenotesSync}`
    );

    // Select one file to update based on specific rules (e.g., shortest path, modification time)
    // This ensures consistency across syncs even if duplicates persist.
    const selectedFile = selectDeterministicFile(plugin, files);

    // Get template based on category
    const template =
        item.category === MediaCategory.ANIME
            ? plugin.settings.animeTemplate || DEFAULT_ANIME_TEMPLATE
            : plugin.settings.mangaTemplate || DEFAULT_MANGA_TEMPLATE;

    const frontmatterProps = generateFrontmatterProperties(
        plugin,
        item,
        template,
        myanimenotesSync
    );

    // Update only the chosen file
    await updateMarkdownFileFrontmatter(plugin, selectedFile, frontmatterProps);

    return {
        action: "duplicates-detected",
        filePath: selectedFile.path,
        myanimenotesSync,
        duplicatePaths: files.map(f => f.path),
        message: `Updated ${selectedFile.path} but found ${files.length} duplicates`
    };
}

/**
 * Creates a new note for a media item that does not yet exist in the vault.
 * Includes logic for:
 * - Filename sanitization.
 * - Initial content generation (frontmatter + template body).
 * - Collision handling (retrying with numeric suffixes if filename is taken).
 *
 * @param plugin - Plugin instance.
 * @param item - The media item data.
 * @param config - Storage configuration.
 * @param myanimenotesSync - The unique sync identifier.
 * @param folderPath - The target directory path.
 * @returns Promise resolving to a 'created' action result.
 */
export async function createNewFile(
    plugin: MyAnimeNotesPlugin,
    item: MediaItem,
    config: StorageConfig,
    myanimenotesSync: string,
    folderPath: string
): Promise<SyncActionResult> {
    const { vault } = plugin.app;

    // 1. Ensure the target folder exists
    await ensureFolderExists(plugin, folderPath);

    // 2. Get the correct template
    const template =
        item.category === MediaCategory.ANIME
            ? plugin.settings.animeTemplate || DEFAULT_ANIME_TEMPLATE
            : plugin.settings.mangaTemplate || DEFAULT_MANGA_TEMPLATE;

    // ========================================================================
    // File Name Generation
    // ========================================================================

    const namePattern = template.fileName || "{{title}}";
    
    // Resolve the variable (e.g. "{{title}} - {{id}}")
    const resolvedResult = resolveTemplate(namePattern, item);
    
    // FORCE TO STRING: resolveTemplate can return arrays (for frontmatter), 
    // but filenames must be strings.
    let resolvedName = "";
    
    if (Array.isArray(resolvedResult)) {
        // If user used a list variable like {{alternativeTitles}}, join them
        resolvedName = resolvedResult.join("-"); 
    } else if (resolvedResult !== undefined && resolvedResult !== null) {
        resolvedName = String(resolvedResult);
    }

    // Fallback: If resolution failed or is empty, use the original title
    if (!resolvedName || resolvedName.trim().length === 0) {
        resolvedName = item.title;
    }

    // Sanitize the result (remove illegal chars like ":", "/", "?")
    const baseFilename = sanitizeFilename(resolvedName);

    // ========================================================================
    // File Creation
    // ========================================================================

    const frontmatterProps = generateFrontmatterProperties(
        plugin,
        item,
        template,
        myanimenotesSync
    );

    const initialContent = generateInitialFileContent(
        frontmatterProps,
        template.noteContent || "",
        item
    );

    const MAX_ATTEMPTS = 5;
    const normalizedFolderPath = normalizePath(folderPath);

    // Collision Resolution Loop (Title.md -> Title-1.md)
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const filename =
            attempt === 1
                ? `${baseFilename}.md`
                : generateUniqueFilename(
                      plugin,
                      vault,
                      normalizedFolderPath,
                      `${baseFilename}.md`
                  );

        const filePath = normalizePath(`${normalizedFolderPath}/${filename}`);

        try {
            const createdFile = await vault.create(filePath, initialContent);
            log.debug(`Created: ${filePath}`);

            return {
                action: "created",
                filePath: createdFile.path,
                myanimenotesSync,
                message: `Created ${createdFile.path}`
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const isCollision = errorMessage.includes("already exists");

            if (!isCollision || attempt >= MAX_ATTEMPTS) {
                throw new Error(
                    isCollision
                        ? `Failed to create file after ${MAX_ATTEMPTS} attempts`
                        : `Failed to create file: ${errorMessage}`
                );
            }
        }
    }

    throw new Error(`Failed to create file for ${myanimenotesSync}`);
}

