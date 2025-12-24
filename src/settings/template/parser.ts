/**
 * Template Parser
 *
 * Resolves template strings by replacing {{variables}} with actual values from MediaItem.
 * Supports:
 * - Multiple variables: "{{numEpisodes}} episodes / {{numEpisodesWatched}} watched"
 * - Mixed content: "Score: {{userScore}}/10"
 * - Pure static text: "My custom value"
 * - Filters: "{{studios|wiklink|join:', '}}"
 */

import type { MediaItem, AlternativeTitles } from "../../models";
import { applyFilters } from "../../settings/template/filters";

/**
 * Extracts variable name and filters from a template variable
 *
 * @param template - Template variable string (e.g., "{{title|lower}}")
 * @returns Object with variable name and filter string
 *
 * @example
 * parseTemplateVariable("{{title|lower|default:'Untitled'}}")
 * // Returns: { varName: "title", filters: "lower|default:'Untitled'" }
 */
function parseTemplateVariable(varString: string): {
    varName: string;
    filters: string;
} {
    // Remove outer {{ }}
    const content = varString.replace(/^\{\{|\}\}$/g, "").trim();

    // Split on first pipe that's not inside quotes
    let pipeIndex = -1;
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        if (
            (char === '"' || char === "'") &&
            (i === 0 || content[i - 1] !== "\\")
        ) {
            if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inQuotes = false;
                quoteChar = "";
            }
        }

        if (char === "|" && !inQuotes) {
            pipeIndex = i;
            break;
        }
    }

    if (pipeIndex === -1) {
        return { varName: content, filters: "" };
    }

    return {
        varName: content.substring(0, pipeIndex).trim(),
        filters: content.substring(pipeIndex + 1).trim()
    };
}

/**
 * Extracts all variables from a template string
 *
 * @param template - Template string with {{variables}}
 * @returns Array of variable info objects
 */
export function extractVariables(
    template: string
): Array<{ varName: string; filters: string; fullMatch: string }> {
    const regex = /\{\{[^}]+\}\}/g;
    const variables: Array<{
        varName: string;
        filters: string;
        fullMatch: string;
    }> = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
        const fullMatch = match[0];
        const { varName, filters } = parseTemplateVariable(fullMatch);
        variables.push({ varName, filters, fullMatch });
    }

    return variables;
}

/**
 * Resolves a property value from MediaItem
 * Maps template variable names to actual item properties
 *
 * @param item - Media item with data
 * @param variableName - Variable name to resolve
 * @returns Resolved value or undefined if not found
 */ function resolvePropertyValue(
    item: MediaItem,
    variableName: string
): string | number | string[] | undefined {
    // Map of variable names to item properties
    const valueMap: Record<string, string | number | string[] | undefined> = {
        // Basic fields
        id: item.id,
        title: item.title,
        category: item.category,
        platform: item.platform,
        url: item.url,

        // Visual
        mainPicture: item.mainPicture?.large || item.mainPicture?.medium,

        // Alternative titles - return as array for Obsidian aliases
        alternativeTitles: extractAliases(item.alternativeTitles),

        // Description
        synopsis: item.synopsis,

        // Metadata
        mediaType: item.mediaType,
        status: item.status,
        mean: item.mean,

        // Genres - return as array of genre names
        genres: item.genres?.map(g => g.name),

        // Dates
        releasedStart: item.releasedStart,
        releasedEnd: item.releasedEnd,
        source: item.source,

        // Anime-specific
        numEpisodes: item.numEpisodes,
        numEpisodesWatched: item.numEpisodesWatched,
        studios: item.studios?.map(s => s.name), // Extract studio names as array
        duration: formatDuration(item.duration),

        // Manga-specific
        numVolumes: item.numVolumes,
        numVolumesRead: item.numVolumesRead,
        numChapters: item.numChapters,
        numChaptersRead: item.numChaptersRead,
        authors: formatAuthors(item.authors),

        // User data
        userStatus: item.userStatus,
        userScore: item.userScore,
        userStartDate: item.userStartDate,
        userFinishDate: item.userFinishDate
    };

    return valueMap[variableName];
}

/**
 * Resolves a template string by replacing {{variables}} with actual values
 *
 * @param template - Template string with {{variables}}, filters, and custom text
 * @param item - Media item with data
 * @returns Resolved string, array (for special cases), or undefined if empty
 *
 * @example
 * resolveTemplate("{{numEpisodes}} episodes", item)
 * // Returns: "24 episodes"
 *
 * resolveTemplate("{{studios|wikilink|join:', '}}", item)
 * // Returns: "[[Studio Bones]], [[MAPPA]]"
 *
 * resolveTemplate("{{alternativeTitles}}", item)
 * // Returns: ["進撃の巨人", "Shingeki no Kyojin"] (array preserved)
 */

export function resolveTemplate(
    template: string,
    item: MediaItem
): string | string[] | undefined {
    if (!template || template.trim() === "") {
        return undefined;
    }

    // Extract all variables from template
    const variables = extractVariables(template);

    // Special case: if template is ONLY a single variable with no other text,
    // we might want to preserve its type (array vs string)
    if (variables.length === 1 && template.trim() === variables[0].fullMatch) {
        const { varName, filters } = variables[0];
        let value = resolvePropertyValue(item, varName);

        // If no value, return undefined
        if (value === undefined || value === null) {
            return undefined;
        }

        // Apply filters if present
        if (filters) {
            value = applyFilters(value, filters, item) as
                | string
                | number
                | string[]
                | undefined;
        }

        // Convert number to string if needed
        if (typeof value === "number") {
            return String(value);
        }

        // Return the value (might be array, string, etc.)
        return value;
    }

    // If no variables found, return template as-is (static text)
    if (variables.length === 0) {
        return template;
    }

    // Replace each {{variable}} with its value
    let result = template;
    let hasAnyValue = false;

    for (const varInfo of variables) {
        const { varName, filters, fullMatch } = varInfo;
        let value = resolvePropertyValue(item, varName);

        if (value !== undefined && value !== null && value !== "") {
            hasAnyValue = true;

            // Apply filters if present
            if (filters) {
                value = applyFilters(value, filters, item) as
                    | string
                    | number
                    | string[]
                    | undefined;
            }

            // Convert to string for template substitution
            let stringValue: string;
            if (Array.isArray(value)) {
                // If result is array after filters, join it
                stringValue = value.join(", ");
            } else {
                stringValue = String(value);
            }

            // Replace this specific occurrence
            result = result.replace(fullMatch, stringValue);
        } else {
            // Remove the {{variable}} placeholder if no value exists
            result = result.replace(fullMatch, "");
        }
    }

    // Clean up result - remove extra whitespace
    result = result.trim();

    // Return undefined if all variables were empty/undefined
    if (!hasAnyValue || result === "") {
        return undefined;
    }

    return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts alternative titles into array format for Obsidian aliases
 */
function extractAliases(
    alternativeTitles: AlternativeTitles | undefined
): string[] | undefined {
    if (!alternativeTitles) return undefined;

    const aliases: string[] = [];

    if (alternativeTitles.en) aliases.push(alternativeTitles.en);
    if (alternativeTitles.ja) aliases.push(alternativeTitles.ja);
    if (
        alternativeTitles.synonyms &&
        Array.isArray(alternativeTitles.synonyms)
    ) {
        aliases.push(...alternativeTitles.synonyms);
    }

    return aliases.length > 0 ? aliases : undefined;
}

/**
 * Formats duration from minutes to human-readable string
 *
 * @example
 * formatDuration(150) // "2h 30m"
 * formatDuration(45)  // "45m"
 */
function formatDuration(minutes: number | undefined): string | undefined {
    if (!minutes || minutes === 0) return undefined;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
        return `${mins}m`;
    }

    return `${hours}h ${mins}m`;
}

/**
 * Formats author array into comma-separated string
 *
 * @example
 * formatAuthors([{firstName: "Hajime", lastName: "Isayama"}])
 * // Returns: "Hajime Isayama"
 */
function formatAuthors(
    authors: Array<{ firstName?: string; lastName?: string }> | undefined
): string | undefined {
    if (!authors || authors.length === 0) return undefined;

    const authorNames = authors
        .map(a => {
            const firstName = a.firstName || "";
            const lastName = a.lastName || "";
            return `${firstName} ${lastName}`.trim();
        })
        .filter(Boolean); // Remove empty strings

    return authorNames.length > 0 ? authorNames.join(", ") : undefined;
}
