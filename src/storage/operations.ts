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
import { log } from "../utils";
import type { StorageConfig, SyncActionResult } from "./types";
import { selectDeterministicFile } from "../core";

// ============================================================================
// FILE HANDLERS
// ============================================================================

export async function handleExactMatch(
    plugin: MyAnimeNotesPlugin,
    file: TFile,
    item: MediaItem,
    config: StorageConfig,
    myanimenotesSync: string
): Promise<SyncActionResult> {
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
    await updateMarkdownFileFrontmatter(plugin, file, frontmatterProps);

    return {
        action: "updated",
        filePath: file.path,
        myanimenotesSync,
        message: `Updated ${file.path}`
    };
}

export async function handleDuplicates(
    plugin: MyAnimeNotesPlugin,
    files: TFile[],
    item: MediaItem,
    config: StorageConfig,
    myanimenotesSync: string
): Promise<SyncActionResult> {
    const debug = log.createSub("Storage");
    debug.warn(
        `[Storage] Found ${files.length} files with myanimenotes: ${myanimenotesSync}`
    );
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
    await updateMarkdownFileFrontmatter(plugin, selectedFile, frontmatterProps);

    return {
        action: "duplicates-detected",
        filePath: selectedFile.path,
        myanimenotesSync,
        duplicatePaths: files.map(f => f.path),
        message: `Updated ${selectedFile.path} but found ${files.length} duplicates`
    };
}

export async function createNewFile(
    plugin: MyAnimeNotesPlugin,
    item: MediaItem,
    config: StorageConfig,
    myanimenotesSync: string,
    folderPath: string
): Promise<SyncActionResult> {
    const debug = log.createSub("Storage");

    const { vault } = plugin.app;

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

    // NEW: Generate initial content with frontmatter + body
    const initialContent = generateInitialFileContent(
        frontmatterProps,
        template.noteContent || "",
        item
    );

    const MAX_ATTEMPTS = 5;
    const normalizedFolderPath = normalizePath(folderPath);

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
            // CHANGED: Use generated content instead of '---\n---\n'
            const createdFile = await vault.create(filePath, initialContent);

            debug.info(`Created: ${filePath}`);

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

            if (!isCollision || attempt >= MAX_ATTEMPTS) {
                throw new Error(
                    isCollision
                        ? `Failed to create file after ${MAX_ATTEMPTS} attempts`
                        : `Failed to create file: ${errorMessage}`
                );
            }

            debug.warn(`Collision on attempt ${attempt}, retrying...`);
        }
    }

    throw new Error(`Failed to create file for ${myanimenotesSync}`);
}
