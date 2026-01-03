/**
 * Trim Filter
 * * Removes leading and trailing whitespace from strings
 * * Processes arrays recursively
 */

/**
 * A template filter that removes leading and trailing whitespace.
 *
 * * Behavior:
 * - **Strings**: Removes spaces, tabs, newlines from both ends
 * - **Arrays**: Trims each string element in the array
 * - **Objects**: Converts to string and trims
 * - **Empty/Null**: Returns empty string
 *
 * * Usage examples:
 * - `{{ "  Attack on Titan  " | trim }}` → "Attack on Titan"
 * - `{{ title | trim }}` → Removes extra whitespace
 * - `{{ genres | trim }}` → Trims each genre in array
 * - `{{ "  \n\tSpaces\n  " | trim }}` → "Spaces"
 *
 * @param value - The input value to trim.
 * @returns Trimmed string or array of trimmed strings.
 */
export function trim(value: unknown): string | string[] {
    // Handle null/undefined/empty
    if (value === undefined || value === null || value === "") {
        return "";
    }

    // Handle arrays - trim each element
    if (Array.isArray(value)) {
        return value.map(item => {
            if (typeof item === "string") {
                return item.trim();
            }
            if (typeof item === "object" && item !== null) {
                return JSON.stringify(item).trim();
            }
            // Safe cast for primitives
            return String(item as string | number | boolean).trim();
        });
    }

    // Handle objects by stringifying
    if (typeof value === "object") {
        return JSON.stringify(value).trim();
    }

    // Handle strings and other primitives
    // Safe cast for primitives to satisfy 'no-base-to-string' rule
    return String(value as string | number | boolean).trim();
}
