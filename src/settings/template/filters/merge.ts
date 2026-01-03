/**
 * Merge Filter
 * * Combines arrays or adds items to an array
 * * Useful for combining multiple data sources
 */

import { logger } from "../../../utils/logger";

const log = new logger("MergeFilter");

/**
 * A template filter that merges arrays or adds items to an array.
 * * * Behavior:
 * - **Merge arrays**: Combines existing array with additional items
 * - **Add items**: `{{ genres | merge:"Mystery","Thriller" }}` → Adds items to array
 * - **Single value**: Converts non-array input to array and adds items
 * - **Empty input**: Returns empty array `[]`
 * * * Parameters:
 * - Comma-separated items to add to the array
 * - Items can be quoted strings or unquoted values
 * * * Usage examples:
 * - `{{ genres | merge:"Mystery" }}` → Adds "Mystery" to genres array
 * - `{{ studios | merge:"MAPPA","Bones" }}` → Adds multiple studios
 * - `{{ tags | merge:"Favorite","Must Watch" }}` → Adds custom tags
 * * @param value - The input value (array, string, or other).
 * @param param - Comma-separated items to merge.
 * @returns JSON stringified merged array.
 */
export function merge(value: unknown, param?: string): string {
    // Return early if input is empty or invalid
    if (value === undefined || value === null || value === "") {
        return "[]";
    }

    let array: unknown[];

    try {
        // Handle different input types
        if (Array.isArray(value)) {
            array = value;
        } else if (typeof value === "string") {
            try {
                // Fix: Explicitly type as unknown to avoid "Unsafe assignment of any value"
                const parsed: unknown = JSON.parse(value);
                // Fix: Cast to unknown[] to match 'array' type
                array = Array.isArray(parsed) ? (parsed as unknown[]) : [value];
            } catch {
                // If parsing fails, treat as single item
                array = [value];
            }
        } else if (typeof value === "object") {
            // Convert object to array of values
            array = Object.values(value as Record<string, unknown>);
        } else {
            // Wrap single value in array
            array = [value];
        }
    } catch (error) {
        log.error("Error parsing JSON in merge filter:", error);
        return typeof value === "string" ? value : JSON.stringify(value);
    }

    // If no parameter provided, just return the array
    if (!param) {
        return JSON.stringify(array);
    }

    // Remove outer parentheses if present
    const cleanParam = param.replace(/^\((.*)\)$/, "$1");

    try {
        // Split the parameter by commas, but not within quotes
        // This regex matches: non-quote/comma sequences, or quoted strings
        const additionalItems =
            cleanParam.match(/(?:[^,"']+|"[^"]*"|'[^']*')+/g) || [];

        // Process each item to remove quotes and trim whitespace
        const processedItems = additionalItems.map(item => {
            item = item.trim();
            // Remove surrounding quotes (both single and double)
            return item.replace(/^(['"])(.*)\1$/, "$2");
        });

        // Merge arrays and return as JSON string
        return JSON.stringify([...array, ...processedItems]);
    } catch (error) {
        log.error("Error processing parameters in merge filter:", error);
        return JSON.stringify(array);
    }
}
