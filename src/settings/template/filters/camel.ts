/**
 * Camel Filter
 * * Converts text to camelCase format
 * * Removes spaces, hyphens, and underscores
 */

/**
 * A template filter that converts text to camelCase format.
 *
 * * Behavior:
 * - **Spaces**: "hello world" → "helloWorld"
 * - **Hyphens**: "my-anime-list" → "myAnimeList"
 * - **Underscores**: "user_status" → "userStatus"
 * - **Mixed**: "Attack on Titan" → "attackOnTitan"
 * - **Already camelCase**: "camelCase" → "camelCase"
 *
 * * Usage examples:
 * - `{{ title | camel }}` → "attackOnTitan"
 * - `{{ mediaType | camel }}` → "tv" or "movie"
 * - `{{ userStatus | camel }}` → "planToWatch"
 *
 * @param value - The input value to convert to camelCase.
 * @returns A camelCase formatted string.
 */
export function camel(value: unknown): string {
    // Return empty string for null/undefined
    if (value === undefined || value === null) {
        return "";
    }

    let str: string;

    // Handle objects by stringifying them to avoid '[object Object]'
    if (typeof value === 'object') {
        str = JSON.stringify(value);
    } else {
        // Safe cast for primitives to satisfy 'no-base-to-string' rule
        str = String(value as string | number | boolean);
    }

    return str
        // 1. Split by any non-alphanumeric character (space, hyphen, underscore, etc.)
        .split(/[\s_-]+/)
        // 2. Filter out empty strings (e.g., if string starts/ends with separator)
        .filter(word => word.length > 0)
        // 3. Transform words
        .map((word, index) => {
            // Lowercase the whole word first to normalize (e.g. "TITAN" -> "titan")
            const lowerWord = word.toLowerCase();
            
            // First word stays lowercase
            if (index === 0) {
                return lowerWord;
            }
            
            // Subsequent words get Capitalized
            return lowerWord.charAt(0).toUpperCase() + lowerWord.slice(1);
        })
        // 4. Join back together
        .join('');
}
