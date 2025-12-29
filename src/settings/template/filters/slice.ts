/**
 * Slice Filter
 * * Extracts a portion of an array or string
 * * Supports start and end indices (similar to JavaScript's slice method)
 */

import { logger } from "../../../utils/logger";

const log = new logger("SliceFilter");

/**
 * A template filter that extracts a portion of an array or string.
 * * * Behavior:
 * - **Arrays**: Returns a subset of elements
 * - **Strings**: Returns a substring
 * - **Start index**: Position to begin extraction (inclusive)
 * - **End index**: Position to end extraction (exclusive)
 * - **Negative indices**: Count from the end (-1 is last element)
 * - **Single element arrays**: Returns the element as a string (not array)
 * * * Parameters:
 * - Format: "start,end" (comma-separated)
 * - Start only: "2" or "2," extracts from index 2 to end
 * - End only: ",5" extracts from start to index 5
 * - Both: "2,5" extracts from index 2 to 5
 * - Negative: "-3" extracts last 3 elements
 * * * Usage examples:
 * - `{{ genres | slice:"0,3" }}` → First 3 genres
 * - `{{ title | slice:"0,10" }}` → First 10 characters
 * - `{{ episodes | slice:"-5" }}` → Last 5 episodes
 * - `{{ studios | slice:"1,2" }}` → Second studio only
 * * @param value - The input value (array or string).
 * @param param - Slice parameters "start,end" (both optional).
 * @returns The sliced portion as string or JSON string.
 */
export function slice(value: unknown, param?: string): string {
    // Require parameters for slice operation
    if (!param) {
        log.debug('Slice filter requires parameters (e.g., "0,5" or "-3")');
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    // Parse start and end indices from parameters
    const [start, end] = param
        .split(',')
        .map(p => p.trim())
        .map(p => {
            if (p === '') return undefined;
            const num = parseInt(p, 10);
            return isNaN(num) ? undefined : num;
        });

    let data: unknown;

    // Try to parse as JSON if it's a string
    if (typeof value === 'string') {
        try {
            data = JSON.parse(value);
        } catch {
            // If parsing fails, treat as plain string
            data = value;
        }
    } else {
        data = value;
    }

    // Handle arrays
    if (Array.isArray(data)) {
        const slicedArray = data.slice(start, end);
        
        // If result is a single element, return it as a string
        if (slicedArray.length === 1) {
            // Fix: Explicitly cast array to unknown[] to allow safe indexing
            const element = (slicedArray as unknown[])[0];
            
            // Handle objects by stringifying
            if (typeof element === 'object' && element !== null) {
                return JSON.stringify(element);
            }
            
            // Safe cast for primitives
            return String(element as string | number | boolean);
        }
        
        // Return array as JSON string
        return JSON.stringify(slicedArray);
    }

    // Handle strings (or anything that should be treated as a string)
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    return str.slice(start, end);
}
