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
import {
    generateFrontmatterProperties,
    updateMarkdownFileFrontmatter,
    generateInitialFileContent,
    generateUniqueFilename
} from "./builders";
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

    // Remove illegal characters for file system compatibility
    const sanitizedTitle = item.title
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim();

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

    // Generate the full file content: Frontmatter fence + Note Body
    const initialContent = generateInitialFileContent(
        frontmatterProps,
        template.noteContent || "",
        item
    );

    const MAX_ATTEMPTS = 5;
    const normalizedFolderPath = normalizePath(folderPath);

    // Collision Resolution Loop
    // Tries to create the file, adding numeric suffixes (e.g., "Title (1).md") if necessary.
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const filename =
            attempt === 1
                ? `${sanitizedTitle}.md`
                : generateUniqueFilename(
                      plugin,
                      vault,
                      normalizedFolderPath,
                      `${sanitizedTitle}.md`
                  );

        const filePath = normalizePath(`${normalizedFolderPath}/${filename}`);

        try {
            // Attempt to create the file with the generated content
            const createdFile = await vault.create(filePath, initialContent);

            log.debug(`Created: ${filePath}`);

            return {
                action: "created",
                filePath: createdFile.path,
                myanimenotesSync,
                message: `Created ${createdFile.path}`
            };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            const isCollision = errorMessage.includes("already exists");

            // If error is not a collision, or we've exceeded retries, fail hard.
            if (!isCollision || attempt >= MAX_ATTEMPTS) {
                throw new Error(
                    isCollision
                        ? `Failed to create file after ${MAX_ATTEMPTS} attempts`
                        : `Failed to create file: ${errorMessage}`
                );
            }

            log.debug(`Collision on attempt ${attempt}, retrying...`);
        }
    }

    throw new Error(`Failed to create file for ${myanimenotesSync}`);
}
