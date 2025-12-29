/**
 * Object Filter
 * * Extracts keys, values, or entries from objects
 * * Useful for converting objects to arrays for iteration
 */

import { logger } from "../../../utils/logger";

const log = new logger("ObjectFilter");

/**
 * A template filter that extracts different parts of an object.
 *
 * * Behavior:
 * - **Keys**: `{{ metadata | object:"keys" }}` → `["title", "year", "genre"]`
 * - **Values**: `{{ metadata | object:"values" }}` → `["Attack on Titan", "2013", "Action"]`
 * - **Array**: `{{ metadata | object:"array" }}` → `[["title", "Attack on Titan"], ["year", "2013"]]`
 * - **No param**: Returns original object
 *
 * * Parameters:
 * - "keys" - Returns array of object keys
 * - "values" - Returns array of object values
 * - "array" - Returns array of [key, value] pairs (entries)
 *
 * * Usage examples:
 * - `{{ studios | object:"keys" }}` → Extract studio IDs
 * - `{{ ratings | object:"values" }}` → Extract rating values
 * - `{{ metadata | object:"array" | list }}` → Convert to list of key-value pairs
 *
 * @param value - The input value (object or JSON string).
 * @param param - Extraction mode ("keys", "values", or "array").
 * @returns JSON stringified array or original value.
 */
export function object(value: unknown, param?: string): string {
    // Handle null/undefined/empty
    if (value === undefined || value === null || value === "") {
        return "";
    }

    // Remove outer parentheses and quotes from parameter if present
    let cleanParam: string | undefined;
    if (param) {
        cleanParam = param
            .replace(/^\((.*)\)$/, "$1")
            .replace(/^(['"])(.*)\1$/, "$2")
            .toLowerCase();
    }

    try {
        let obj: unknown;

        // Parse input into object
        if (typeof value === "string") {
            obj = JSON.parse(value);
        } else {
            obj = value;
        }

        // Validate that it's actually an object
        if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
            log.debug("Input is not a valid object for object filter");
            return typeof value === "string" ? value : JSON.stringify(value);
        }

        // Cast to Record for property access
        const record = obj as Record<string, unknown>;

        // Extract based on parameter
        switch (cleanParam) {
            case "array":
                // Returns array of [key, value] pairs
                return JSON.stringify(Object.entries(record));

            case "keys":
                // Returns array of keys
                return JSON.stringify(Object.keys(record));

            case "values":
                // Returns array of values
                return JSON.stringify(Object.values(record));

            default:
                // Return original if no valid param
                return typeof value === "string"
                    ? value
                    : JSON.stringify(value);
        }
    } catch (error) {
        log.error("Error parsing JSON for object filter:", error);
        return typeof value === "string" ? value : JSON.stringify(value);
    }
}
