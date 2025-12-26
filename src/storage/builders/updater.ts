/**
 * Markdown Updater
 *
 * This module handles the specific task of updating existing Markdown files.
 * It leverages Obsidian's `FileManager.processFrontMatter()` API to perform
 * safe, atomic updates to the YAML header without risking corruption of the
 * user's note body or existing manual customizations.
 */

import { TFile } from "obsidian";
import type MyAnimeNotesPlugin from "../../main";
import type { MediaItem } from "../../models";
import type { TemplateConfig } from "../../settings/template";
import { buildFrontmatterFromTemplate } from "./frontmatter";
import { logger } from "../../utils/logger";

const log = new logger("FrontmatterUpdater");

/**
 * Generates the complete set of frontmatter properties for a specific media item.
 *
 * This serves as a wrapper around the core builder logic, providing a convenient
 * entry point for other parts of the service layer.
 *
 * @param plugin - Plugin instance.
 * @param item - The media item (Anime/Manga) containing the source data.
 * @param template - The user's template configuration defining which fields to sync.
 * @param myanimenotesSync - The unique identifier for synchronization.
 * @returns A plain object containing all the properties to be written to the file.
 */
export function generateFrontmatterProperties(
    plugin: MyAnimeNotesPlugin,
    item: MediaItem,
    template: TemplateConfig,
    myanimenotesSync: string
): Record<string, unknown> {
    return buildFrontmatterFromTemplate(item, template, myanimenotesSync);
}

/**
 * Updates an existing Markdown file's frontmatter with new data.
 *
 * Strategy: Safe Merging
 * Instead of rewriting the entire file (which is risky), this function uses
 * Obsidian's native `processFrontMatter` API. This ensures that:
 * 1. The note body is strictly preserved.
 * 2. User-defined properties (keys not managed by this plugin) are left untouched.
 * 3. Only the keys defined in the plugin's template are updated/overwritten.
 *
 * @param plugin - Plugin instance (access to FileManager).
 * @param file - The specific TFile object to update.
 * @param frontmatterProps - The new properties object to merge into the file.
 * @returns A Promise that resolves when the write operation is complete.
 */
export async function updateMarkdownFileFrontmatter(
    plugin: MyAnimeNotesPlugin,
    file: TFile,
    frontmatterProps: Record<string, unknown>
): Promise<void> {
    const { fileManager } = plugin.app;

    try {
        // Atomic update via Obsidian API
        await fileManager.processFrontMatter(
            file,
            (frontmatter: Record<string, unknown>) => {
                // Merge logic: Iterate through the new properties and apply them
                // to the file's frontmatter object.
                Object.entries(frontmatterProps).forEach(([key, value]) => {
                    // Update or add the key-value pair
                    frontmatter[key] = value;
                });
                
                // Note: Keys present in 'frontmatter' but NOT in 'frontmatterProps'
                // are effectively preserved (not deleted).
            }
        );
    } catch (error) {
        log.error("Error updating frontmatter:", error);
        throw error;
    }
}
