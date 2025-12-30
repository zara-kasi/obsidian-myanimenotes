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
 * Extracts variable name and filters from a template variable string.
 * This parses the inner content of a `{{...}}` block.
 *
 * @param varString - The raw content inside braces (e.g., "title|lower").
 * @returns Object containing the clean variable name and the raw filter string.
 *
 * @example
 * parseTemplateVariable("{{title|lower|default:'Untitled'}}")
 * // Returns: { varName: "title", filters: "lower|default:'Untitled'" }
 */
function parseTemplateVariable(varString: string): {
    varName: string;
    filters: string;
} {
    // Remove outer {{ }} characters
    const content = varString.replace(/^\{\{|\}\}$/g, "").trim();

    // Logic to split on the first pipe '|' that is NOT inside quotes
    // This allows filters to accept arguments with pipes if they are quoted (e.g., default:'|')
    let pipeIndex = -1;
    let inQuotes = false;
    let quoteChar = "";

    for (let i = 0; i < content.length; i++) {
        const char = content[i];

        // Toggle quote state
        if (
            (char === '"' || char === "'") &&
            (i === 0 || content[i - 1] !== "\\") // Ignore escaped quotes
        ) {
            if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inQuotes = false;
                quoteChar = "";
            }
        }

        // Found a pipe outside of quotes -> this splits variable from filters
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
 * Extracts all unique variables from a template string.
 *
 * @param template - Template string containing zero or more {{variables}}.
 * @returns Array of objects containing parsed variable info and the full match string.
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

    // Iterate through all matches of {{...}}
    while ((match = regex.exec(template)) !== null) {
        const fullMatch = match[0];
        const { varName, filters } = parseTemplateVariable(fullMatch);
        variables.push({ varName, filters, fullMatch });
    }

    return variables;
}

/**
 * Resolves a property value from a MediaItem based on the variable name.
 * Acts as a mapping layer between the template system and the internal data model.
 *
 * @param item - Media item containing the source data.
 * @param variableName - The key requested in the template (e.g., "numEpisodes").
 * @returns The resolved value (string, number, array, or undefined).
 */
function resolvePropertyValue(
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
        // Individual alternative title components
        titleEnglish: item.alternativeTitles?.en,
        titleJapanese: item.alternativeTitles?.ja,
        titleSynonyms: item.alternativeTitles?.synonyms,
        // Description
        synopsis: item.synopsis,

        // Metadata
        mediaType: item.mediaType,
        status: item.status,
        mean: item.mean,

        // Genres - return as array of genre names (e.g., ["Action", "Adventure"])
        genres: item.genres?.map(g => g.name),

        // Dates
        releasedStart: item.releasedStart,
        releasedEnd: item.releasedEnd,
        source: item.source,

        // Anime-specific
        numEpisodes: item.numEpisodes,
        numEpisodesWatched: item.numEpisodesWatched,
        studios: item.studios?.map(s => s.name), // Extract studio names as array
        duration: item.duration,

        // Manga-specific
        numVolumes: item.numVolumes,
        numVolumesRead: item.numVolumesRead,
        numChapters: item.numChapters,
        numChaptersRead: item.numChaptersRead,
        authors: item.authors
            ?.map(a => {
                const firstName = a.firstName || "";
                const lastName = a.lastName || "";
                return `${firstName} ${lastName}`.trim();
            })
            .filter(Boolean),

        // User data
        userStatus: item.userStatus,
        userScore: item.userScore,
        userStartDate: item.userStartDate,
        userFinishDate: item.userFinishDate
    };

    return valueMap[variableName];
}

/**
 * Resolves a complete template string by replacing all `{{variables}}` with actual values.
 * Handles mixed content (text + variables), single variable preservation (arrays), and filter application.
 *
 * @param template - Template string with {{variables}}, filters, and custom text.
 * @param item - Media item containing the data.
 * @returns The resolved string, an array (for single-variable list contexts), or undefined if result is empty.
 *
 * @example
 * resolveTemplate("{{numEpisodes}} episodes", item)
 * // Returns: "24 episodes"
 *
 * resolveTemplate("{{studios|wikilink|join:', '}}", item)
 * // Returns: "[[Studio Bones]], [[MAPPA]]"
 *
 * resolveTemplate("{{alternativeTitles}}", item)
 * // Returns: ["進撃の巨人", "Shingeki no Kyojin"] (preserves array type for YAML)
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

    // CASE 1: Single Variable (No extra text)
    // If the template is ONLY "{{var}}", we preserve the original type (e.g., array).
    // This is crucial for frontmatter properties like `aliases` or `tags`.
    if (variables.length === 1 && template.trim() === variables[0].fullMatch) {
        const { varName, filters } = variables[0];
        let value = resolvePropertyValue(item, varName);

        // If no value, return undefined (field will be omitted)
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

        // Convert number to string if needed (templates generally output strings)
        if (typeof value === "number") {
            return String(value);
        }

        // Return the raw value (might be array, string, etc.)
        return value;
    }

    // CASE 2: Static Text (No variables)
    if (variables.length === 0) {
        return template;
    }

    // CASE 3: Mixed Content (Text + Variables)
    // We perform string replacement. Arrays must be joined into strings.
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
                // If result is array after filters, join it nicely
                stringValue = value.join(", ");
            } else {
                stringValue = String(value);
            }

            // Replace this specific occurrence
            result = result.replace(fullMatch, stringValue);
        } else {
            // If value is missing, remove the {{variable}} placeholder entirely
            result = result.replace(fullMatch, "");
        }
    }

    // Clean up result - remove extra whitespace left by removed variables
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
 * Extracts and flattens alternative titles into a single string array.
 * Useful for populating the `aliases` property in Obsidian.
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
