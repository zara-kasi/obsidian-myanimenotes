/**
 * Length Filter
 * * Returns the length/count of the input value
 * * Works with strings, arrays, and objects
 */

import { logger } from '../../../utils/logger';

const log = new logger('LengthFilter');

/**
 * A template filter that returns the length or count of a value.
 *
 * * Behavior:
 * - **Strings**: Returns character count
 * - **Arrays**: Returns number of elements
 * - **Objects**: Returns number of keys/properties
 * - **Numbers**: Converts to string and returns digit count
 *
 * * Usage examples:
 * - `{{ title | length }}` → "17" (for "Attack on Titan")
 * - `{{ genres | length }}` → "3" (for ["Action", "Fantasy", "Adventure"])
 * - `{{ metadata | length }}` → "5" (for object with 5 properties)
 * - `{{ synopsis | length }}` → Character count of synopsis
 *
 * @param value - The input value to measure.
 * @returns The length/count as a string.
 */
export function length(value: unknown): string {
    // Handle null/undefined
    if (value === null || value === undefined) {
        return '0';
    }

    // Handle empty string
    if (value === '') {
        return '0';
    }

    // Handle arrays directly
    if (Array.isArray(value)) {
        return value.length.toString();
    }

    // Handle objects directly
    if (typeof value === 'object') {
        return Object.keys(value as Record<string, unknown>).length.toString();
    }

    // Handle strings (including string representations of JSON)
    if (typeof value === 'string') {
        try {
            // Fix: Explicitly type as unknown to avoid "Unsafe assignment of any value"
            const parsed: unknown = JSON.parse(value);

            if (Array.isArray(parsed)) {
                // For arrays, return the number of items
                return parsed.length.toString();
            } else if (typeof parsed === 'object' && parsed !== null) {
                // Fix: Cast to Record or object to avoid "Unsafe argument" error
                return Object.keys(parsed as Record<string, unknown>).length.toString();
            }
            // If parsing succeeds but it's not an array or object,
            // treat it as a string
            return value.length.toString();
        } catch {
            // Fix: Removed unused (error) variable
            // If parsing fails, treat as a string and return its length
            log.debug('Value is not valid JSON, returning string length');
            return value.length.toString();
        }
    }

    // For numbers and booleans, convert to string and return length
    return String(value as string | number | boolean).length.toString();
}
