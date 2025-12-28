/**
 * First Filter
 * * Returns the first element of an array
 * * Useful for extracting the primary item from multi-value fields
 */

/**
 * A template filter that returns the first element of an array.
 *
 * * Behavior:
 * - **Arrays**: Returns the first element
 * - **Strings**: Returns the string as-is
 * - **Single values**: Returns the value as-is
 * - **Empty arrays**: Returns empty string
 *
 * * Usage examples:
 * - `{{ genres | first }}` → "Action" (from ["Action", "Fantasy", "Adventure"])
 * - `{{ studios | first }}` → "MAPPA" (from ["MAPPA", "Studio Bones"])
 * - `{{ alternativeTitles | first }}` → First alternative title
 *
 * @param value - The input value (array or string).
 * @returns The first element as a string, or original value if not an array.
 */
export function first(value: unknown): string {
    // Handle null/undefined/empty
    if (value === null || value === undefined || value === "") {
        return "";
    }

    // Handle arrays directly
    if (Array.isArray(value)) {
        // Safe cast to unknown[] to avoid 'unsafe assignment' error
        const arr = value as unknown[];

        if (arr.length > 0) {
            const firstItem = arr[0];

            // If the first item is an object, stringify it
            if (typeof firstItem === "object" && firstItem !== null) {
                return JSON.stringify(firstItem);
            }
            // Otherwise return as string, safely casting to primitive
            return String(firstItem as string | number | boolean);
        }
        return "";
    }

    // Handle objects by stringifying
    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    // For non-array primitives (strings, numbers, booleans), return as string
    // Cast avoids 'no-base-to-string' error
    return String(value as string | number | boolean);
}
