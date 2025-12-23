/**
 * Markdown Generator - Refactored for Obsidian FileManager API
 *
 * Now uses Obsidian's FileManager.processFrontMatter() for safe frontmatter handling
 * Separates frontmatter generation from file writing
 */
import { TFile } from "obsidian";
import type MyAnimeNotesPlugin from "../../main";
import type { UniversalMediaItem } from "../../transformers";
import type { TemplateConfig } from "../../settings/template";
import { buildFrontmatterFromTemplate } from "./frontmatter";
import { log } from "../../utils";

/**
 * Generates frontmatter properties for a media item using template configuration
 * @param plugin Plugin instance
 * @param item Media item to generate frontmatter for
 * @param template Template configuration (anime or manga)
 * @param myanimenotesSync MyAnimeNotes identifier
 * @returns Frontmatter properties object
 */

export function generateFrontmatterProperties(
    plugin: MyAnimeNotesPlugin,
    item: UniversalMediaItem,
    template: TemplateConfig,
    myanimenotesSync: string
): Record<string, unknown> {
    return buildFrontmatterFromTemplate(item, template, myanimenotesSync);
}

/**
 * Updates an existing markdown file's frontmatter
 * Preserves existing body content automatically via processFrontMatter
 */

export async function updateMarkdownFileFrontmatter(
    plugin: MyAnimeNotesPlugin,
    file: TFile,
    frontmatterProps: Record<string, unknown>
): Promise<void> {
    const debug = log.createSub("Markdown");
    const { fileManager } = plugin.app;

    try {
        await fileManager.processFrontMatter(
            file,
            (frontmatter: Record<string, unknown>) => {
                // Merge synced properties into existing frontmatter
                // This preserves any user-added properties
                Object.entries(frontmatterProps).forEach(([key, value]) => {
                    frontmatter[key] = value;
                });
            }
        );
    } catch (error) {
        debug.error("Error updating frontmatter:", error);
        throw error;
    }
}
