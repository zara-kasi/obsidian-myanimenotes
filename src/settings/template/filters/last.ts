/**
 * Last Filter
 * * Returns the last element of an array
 * * Useful for extracting the final item from multi-value fields
 */

import { logger } from "../../../utils/logger";

const log = new logger("LastFilter");

/**
 * A template filter that returns the last element of an array.
 *
 * * Behavior:
 * - **Arrays**: Returns the last element
 * - **Strings**: Returns the string as-is
 * - **Single values**: Returns the value as-is
 * - **Empty arrays**: Returns empty string
 *
 * * Usage examples:
 * - `{{ genres | last }}` → "Adventure" (from ["Action", "Fantasy", "Adventure"])
 * - `{{ studios | last }}` → "Studio Bones" (from ["MAPPA", "Studio Bones"])
 * - `{{ alternativeTitles | last }}` → Last alternative title
 *
 * @param value - The input value (array or string).
 * @returns The last element as a string, or original value if not an array.
 */
export function last(value: unknown): string {
    // Handle null/undefined/empty
    if (value === null || value === undefined || value === "") {
        return "";
    }

    // Handle arrays directly
    if (Array.isArray(value)) {
        const arr = value as unknown[];

        if (arr.length > 0) {
            const lastItem = arr[arr.length - 1];

            // If the last item is an object, stringify it
            if (typeof lastItem === "object" && lastItem !== null) {
                return JSON.stringify(lastItem);
            }
            // Otherwise return as string, safely casting to primitive
            return String(lastItem as string | number | boolean);
        }
        return "";
    }

    // If it's a string that might be JSON, try to parse it
    if (typeof value === "string") {
        try {
            // Fix: Explicitly type as unknown
            const parsed: unknown = JSON.parse(value);

            if (Array.isArray(parsed) && parsed.length > 0) {
                // FIX: Cast to unknown[] to ensure elements are treated as unknown, not any
                const safeArray = parsed as unknown[];
                const lastItem = safeArray[safeArray.length - 1];

                if (typeof lastItem === "object" && lastItem !== null) {
                    return JSON.stringify(lastItem);
                }
                return String(lastItem);
            }
        } catch {
            // Fix: Removed unused (error) variable
            // Not JSON, just return the string
            log.debug("Value is not valid JSON, returning as-is");
        }
        return value;
    }

    // Handle objects by stringifying
    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    // For non-array primitives (strings, numbers, booleans), return as string
    return String(value as string | number | boolean);
}
