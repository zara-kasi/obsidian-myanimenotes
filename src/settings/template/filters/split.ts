/**
 * Split Filter
 * * Splits a string into an array
 */

/**
 * A template filter that splits a string into an array based on a specified delimiter.
 * * * Key Behaviors:
 * - **Trimming**: Automatically removes whitespace from the start/end of each item.
 * - **Filtering**: Removes empty strings (e.g., "a,,b" becomes ["a", "b"]).
 * - **Type Safety**: Converts non-string inputs to JSON strings before splitting.
 * * Usage example: `{{ "Action, Adventure, " | split:"," }}` -> `["Action", "Adventure"]`
 * * @param value - The input string to split.
 * @param separator - The character pattern to split by (default: comma).
 * @returns An array of cleaned strings. Returns an empty array if input is null/empty.
 */
export function split(value: unknown, separator = ","): string[] {
    // Return empty array for null/undefined/empty inputs
    if (value === undefined || value === null || value === "") {
        return [];
    }

    // Ensure input is a string
    const str = typeof value === "string" ? value : JSON.stringify(value);

    return str
        .split(separator)
        .map(item => item.trim()) // Remove surrounding whitespace from each segment
        .filter(Boolean); // Remove empty strings (e.g., trailing commas)
}
