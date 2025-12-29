/**
 * Reverse Filter
 * * Reverses the order of arrays, object entries, or string characters
 * * Handles multiple data types intelligently
 */

import { logger } from "../../../utils/logger";

const log = new logger("ReverseFilter");

/**
 * A template filter that reverses the order of elements.
 * * * Behavior:
 * - **Arrays**: Reverses element order [1,2,3] → [3,2,1]
 * - **Objects**: Reverses the order of key-value pairs
 * - **Strings**: Reverses character order "abc" → "cba"
 * - **Empty/Invalid**: Returns empty string
 * * * Usage examples:
 * - `{{ genres | reverse }}` → ["Adventure", "Fantasy", "Action"]
 * - `{{ title | reverse }}` → Reverses characters in title
 * - `{{ episodes | reverse }}` → Shows episodes in reverse order
 * - `{{ metadata | reverse }}` → Reverses object entries
 * * @param value - The input value (array, object, string, or JSON string).
 * @returns The reversed value as string or JSON string.
 */
export function reverse(value: unknown): string {
    // Return early if input is empty or invalid
    if (
        value === undefined ||
        value === null ||
        value === "" ||
        value === "undefined" ||
        value === "null"
    ) {
        return "";
    }

    let data: unknown;

    // Try to parse as JSON if it's a string
    if (typeof value === "string") {
        try {
            data = JSON.parse(value);
        } catch {
            // If parsing fails, reverse the string characters
            return value.split("").reverse().join("");
        }
    } else {
        data = value;
    }

    try {
        // Handle arrays
        if (Array.isArray(data)) {
            // Create a copy to avoid mutating the original
            // Fix: Explicitly cast to unknown[] to avoid "unsafe spread of any" error
            const reversed = [...(data as unknown[])].reverse();
            return JSON.stringify(reversed);
        }

        // Handle objects by reversing key-value pairs
        if (typeof data === "object" && data !== null) {
            const entries = Object.entries(data as Record<string, unknown>);
            const reversedEntries = entries.reverse();
            const reversedObject = Object.fromEntries(reversedEntries);
            return JSON.stringify(reversedObject);
        }

        // For other types, convert to string and reverse
        const str = String(data as string | number | boolean);
        return str.split("").reverse().join("");
    } catch (error) {
        log.error("Error in reverse filter:", error);

        // Fallback: treat as string
        const str = typeof value === "string" ? value : JSON.stringify(value);
        return str.split("").reverse().join("");
    }
}
