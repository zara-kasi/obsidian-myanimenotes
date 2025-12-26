/**
 * Upper Filter
 * * Converts text to uppercase
 */

/**
 * A template filter that converts the input value to uppercase.
 * * Behavior:
 * - **Strings**: Converted directly (e.g., "anime" -> "ANIME").
 * - **Arrays**: Returns a new array where every element is uppercased.
 * - **Objects/Numbers**: Converted to a JSON string first, then uppercased.
 * - **Null/Undefined**: returned as-is.
 * * @param value - The input value to process.
 * @returns The uppercase string, array of uppercase strings, or the original null/undefined value.
 */
export function upper(value: unknown): string | string[] | null | undefined {
    // Pass through empty/null values without modification
    if (value === undefined || value === null || value === "") {
        return value;
    }

    // Handle arrays (e.g., uppercasing a list of genres)
    if (Array.isArray(value)) {
        return value.map(item => {
            if (typeof item === "string") return item.toUpperCase();
            // Safe fallback for non-string items in an array
            return JSON.stringify(item).toUpperCase();
        });
    }

    // Handle standard strings
    if (typeof value === "string") {
        return value.toUpperCase();
    }

    // Handle other types (numbers, objects) by stringifying them first
    return JSON.stringify(value).toUpperCase();
}
