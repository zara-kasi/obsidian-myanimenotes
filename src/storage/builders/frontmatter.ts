/**
 * Frontmatter Builder
 *
 * This module is responsible for constructing the metadata object (frontmatter)
 * for a note. It maps the user's template configuration to the actual data
 * from MyAnimeList.
 *
 * REFACTORED: This module no longer handles YAML serialization manually.
 * It returns plain JavaScript objects, which allows Obsidian's `FileManager.processFrontMatter`
 * API to handle the safe writing and merging of YAML.
 */

import type { MediaItem } from "../../models";
import type { TemplateConfig } from "../../settings/template";
import { formatPropertyValue, 
resolveTemplate } from "../../settings/template";

/**
 * Builds a clean frontmatter properties object based on the user's template configuration.
 *
 * This function iterates through every property defined in the user's settings,
 * resolves the corresponding value from the media item (e.g., replacing "{{title}}" with "Naruto"),
 * and formats it according to the specified data type (string, number, list, etc.).
 *
 * @param item - The universal media item (Anime or Manga) containing the data.
 * @param template - The user's configuration defining which properties to save.
 * @param myanimenotesSync - The unique, permanent identifier for synchronization.
 * @returns A plain object representing the frontmatter properties (key-value pairs).
 */
export function buildFrontmatterFromTemplate(
    item: MediaItem,
    template: TemplateConfig,
    myanimenotesSync: string
): Record<string, unknown> {
    const properties: Record<string, unknown> = {};

    // Process each property defined in the template settings
    for (const prop of template.properties) {
        let resolvedValue: unknown;

        // Handle specific "permanent" system properties that control sync logic
        if (prop.template === "myanimenotes") {
            resolvedValue = myanimenotesSync;
        } else if (prop.template === "synced") {
            resolvedValue = item.updatedAt;
        } else {
            // For standard user properties, resolve the variable placeholders
            resolvedValue = resolveTemplate(prop.template, item);
        }

        // Skip properties that failed to resolve or are empty
        // This keeps the frontmatter clean by avoiding empty keys
        if (
            resolvedValue === undefined ||
            resolvedValue === null ||
            resolvedValue === ""
        ) {
            continue;
        }

        // ====================================================================
        // KEY CHANGE: Format the value according to its type
        // This ensures data integrity (e.g., "8.5" string becomes 8.5 number)
        // and prevents Obsidian from flagging type warnings in the properties UI.
        // ====================================================================
        const formattedValue = formatPropertyValue(resolvedValue, prop.type);

        // Assign the formatted value to the custom key name defined by the user
        properties[prop.customName] = formattedValue;
    }

    return properties;
}
