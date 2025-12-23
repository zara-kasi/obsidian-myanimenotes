/**
 * Frontmatter Builder
 *
 * Builds frontmatter properties from media items with myanimenotes as primary key
 * Handles merging with existing frontmatter while preserving user properties
 *
 * REFACTORED: Removed manual YAML serialization
 * Now returns plain objects - Obsidian's FileManager.processFrontMatter handles YAML
 */

import type { UniversalMediaItem } from "../../transformers";
import type { TemplateConfig } from "../../settings/template";
import { formatPropertyValue, 
resolveTemplate } from "../../settings/template";

/**
 * Builds frontmatter properties from template configuration
 * Processes template properties in order and resolves values from media item
 *
 * @param item - Universal media item
 * @param template - Template configuration with property definitions
 * @param myanimenotesSync - MyAnimeNotes identifier
 * @returns Frontmatter properties object
 */

export function buildFrontmatterFromTemplate(
    item: UniversalMediaItem,
    template: TemplateConfig,
    myanimenotesSync: string
): Record<string, unknown> {
    const properties: Record<string, unknown> = {};

    // Process each template property
    for (const prop of template.properties) {
        let resolvedValue: unknown;

        // Handle permanent properties
        if (prop.template === "myanimenotes") {
            resolvedValue = myanimenotesSync;
        } else if (prop.template === "synced") {
            resolvedValue = item.updatedAt;
        } else {
            // Resolve template string
            resolvedValue = resolveTemplate(prop.template, item);
        }

        // Skip if no value
        if (
            resolvedValue === undefined ||
            resolvedValue === null ||
            resolvedValue === ""
        ) {
            continue;
        }

        // ====================================================================
        // KEY CHANGE: Format the value according to its type
        // This ensures "8" becomes 8 for numbers, preventing Obsidian warnings
        // ====================================================================
        const formattedValue = formatPropertyValue(resolvedValue, prop.type);

        // Add to properties
        properties[prop.customName] = formattedValue;
    }

    return properties;
}
