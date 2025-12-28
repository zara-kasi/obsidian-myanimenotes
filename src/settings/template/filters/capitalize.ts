/**
 * Capitalize Filter
 * * Capitalizes the first letter of strings and makes the rest lowercase
 * * Recursively processes arrays and objects
 */

/**
 * A template filter that capitalizes the first letter of text.
 * * * Behavior:
 * - **Strings**: "attack on titan" → "Attack on titan"
 * - **Arrays**: ["action", "fantasy"] → ["Action", "Fantasy"]
 * - **Objects**: Capitalizes both keys and string values recursively
 * - **Mixed case**: "ATTACK" → "Attack", "aTTaCk" → "Attack"
 * * * Usage examples:
 * - `{{ title | capitalize }}` → "Attack on titan"
 * - `{{ userStatus | capitalize }}` → "Watching"
 * - `{{ genres | capitalize }}` → ["Action", "Fantasy", "Adventure"]
 * * @param value - The input value to capitalize.
 * @returns The capitalized string, array, or object.
 */
export function capitalize(value: unknown): string | string[] {
    /**
     * Capitalizes a single string: first letter uppercase, rest lowercase.
     */
    const capitalizeString = (str: string): string => 
        str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

    /**
     * Recursively capitalizes strings in any data structure.
     */
    const parseAndCapitalize = (val: unknown): unknown => {
        if (typeof val === 'string') {
            return capitalizeString(val);
        } else if (Array.isArray(val)) {
            return val.map(parseAndCapitalize);
        } else if (typeof val === 'object' && val !== null) {
            const result: Record<string, unknown> = {};
            // Safe cast to iterate over object keys
            for (const [key, v] of Object.entries(val as Record<string, unknown>)) {
                result[capitalizeString(key)] = parseAndCapitalize(v);
            }
            return result;
        }
        return val;
    };

    // Handle null/undefined/empty
    if (value === undefined || value === null || value === '') {
        return '';
    }

    // Handle arrays directly
    if (Array.isArray(value)) {
        return value.map(item => {
            if (typeof item === 'string') {
                return capitalizeString(item);
            }
            // If item is an object, process recursively and stringify
            if (typeof item === 'object' && item !== null) {
                return JSON.stringify(parseAndCapitalize(item));
            }
            // Safe cast for primitives
            return String(item as string | number | boolean);
        });
    }

    // Handle objects by stringifying
    if (typeof value === 'object') {
        const capitalized = parseAndCapitalize(value);
        return JSON.stringify(capitalized);
    }

    // Handle strings and other primitives
    // Cast avoids 'no-base-to-string' error
    return capitalizeString(String(value as string | number | boolean));
}
