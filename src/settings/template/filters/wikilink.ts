/**
 * Wikilink Filter
 *
 * Converts values into Obsidian wikilinks [[value]]
 */

/**
 * A template filter that wraps values in Obsidian's internal link syntax `[[...]]`.
 *
 * * Behavior:
 * - **Strings**: Wraps the trimmed string (e.g., " Studio Bones " -> "[[Studio Bones]]").
 * - **Arrays**: Returns a new array where every valid item is wrapped (e.g., ["Action", "Fantasy"] -> ["[[Action]]", "[[Fantasy]]"]).
 * - **Objects/Numbers**: Converted to a JSON string first, then wrapped.
 * - **Empty/Null**: Returned as-is to avoid creating empty links like `[[]]`.
 *
 * * Usage example: `{{ studios | wikilink }}` -> `[[Studio Bones]]`
 *
 * @param value - The input value to transform.
 * @returns The wikilink string, an array of wikilinks, or the original null/undefined value.
 */
export function wikilink(value: unknown): string | string[] | null | undefined {
    // Pass through empty/null values without modification
    if (value === undefined || value === null || value === "") {
        return value;
    }

    // Handle arrays (e.g., creating links for a list of Genres or Studios)
    if (Array.isArray(value)) {
        return value.map(item => {
            // Ensure item is a string and remove whitespace
            const str = (
                typeof item === "string" ? item : JSON.stringify(item)
            ).trim();
            // Only wrap if the resulting string is not empty
            return str ? `[[${str}]]` : str;
        });
    }

    // Handle single values (e.g., creating a link for the Author)
    const str = (
        typeof value === "string" ? value : JSON.stringify(value)
    ).trim();
    return str ? `[[${str}]]` : str;
}
