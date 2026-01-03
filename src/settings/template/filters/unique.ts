/**
 * Unique Filter
 * * Removes duplicate values from arrays and objects
 * * Handles both primitive values and complex objects
 */

import { logger } from "../../../utils/logger";

const log = new logger("UniqueFilter");

/**
 * A template filter that removes duplicate values from arrays and objects.
 * 
 * * Behavior:
 * - **Array of primitives**: Uses Set to remove duplicates (e.g., [1,2,2,3] → [1,2,3])
 * - **Array of objects**: Compares stringified versions to find duplicates
 * - **Objects**: Removes duplicate values, keeping the last occurrence's key
 * - **Non-array/object**: Returns unchanged
 * 
 * * How it works:
 * - For arrays: Filters out elements that appear more than once
 * - For objects: Reverses entries, removes duplicate values, reverses back
 * - For primitives: Returns as-is (no duplicates possible)
 * 
 * * Usage examples:
 * - `{{ genres | unique }}` → ["Action", "Fantasy"] (removes duplicate "Action")
 * - `{{ tags | unique }}` → Removes duplicate tags
 * - `{{ studios | unique }}` → Unique studio list
 * 
 * @param value - The input value (array, object, or JSON string).
 * @returns JSON string with duplicates removed, or original value.
 */
export function unique(value: unknown): string {
    // Handle null/undefined/empty
    if (value === undefined || value === null || value === '') {
        return '';
    }

    let data: unknown;

    // Try to parse as JSON if it's a string
    if (typeof value === 'string') {
        try {
            data = JSON.parse(value);
        } catch {
            // If parsing fails, return as-is (string with no duplicates to remove)
            log.debug('Could not parse value as JSON, returning unchanged');
            return value;
        }
    } else {
        data = value;
    }

    try {
        // Handle arrays
        if (Array.isArray(data)) {
            // For arrays of primitives (strings, numbers, booleans)
            if (data.every(item => typeof item !== 'object' || item === null)) {
                return JSON.stringify([...new Set(data)]);
            }

            // For arrays of objects, compare stringified versions
            const seen = new Set<string>();
            const uniqueArray = data.filter(item => {
                const stringified = JSON.stringify(item);
                if (seen.has(stringified)) {
                    return false;
                }
                seen.add(stringified);
                return true;
            });

            return JSON.stringify(uniqueArray);
        }

        // Handle objects - remove duplicate values while keeping the last occurrence's key
        if (typeof data === 'object' && data !== null) {
            const reverseEntries = Object.entries(data as Record<string, unknown>).reverse();
            const seen = new Set<string>();
            
            const uniqueEntries = reverseEntries.filter(([_, val]) => {
                const stringified = JSON.stringify(val);
                if (seen.has(stringified)) {
                    return false;
                }
                seen.add(stringified);
                return true;
            }).reverse();

            return JSON.stringify(Object.fromEntries(uniqueEntries));
        }

        // If not an array or object, return as JSON string
        return JSON.stringify(data);
        
    } catch (error) {
        log.error('Error in unique filter:', error);
        return typeof value === 'string' ? value : JSON.stringify(value);
    }
}