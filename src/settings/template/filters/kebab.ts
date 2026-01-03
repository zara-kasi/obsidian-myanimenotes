/**
 * Kebab Filter
 * * Converts text to kebab-case format (lowercase with hyphens)
 * * Useful for creating URL-friendly or file-friendly identifiers
 */

/**
 * A template filter that converts text to kebab-case format.
 * * * Behavior:
 * - **Spaces to hyphens**: "hello world" → "hello-world"
 * - **Underscores to hyphens**: "user_status" → "user-status"
 * - **CamelCase**: "myAnimeList" → "my-anime-list"
 * - **PascalCase**: "AttackOnTitan" → "attack-on-titan"
 * - **Mixed**: "My Anime_List" → "my-anime-list"
 * - **Lowercase**: All output is lowercase
 * * * Usage examples:
 * - `{{ title | kebab }}` → "attack-on-titan"
 * - `{{ mediaType | kebab }}` → "tv-special"
 * - `{{ userStatus | kebab }}` → "plan-to-watch"
 * * @param value - The input value to convert to kebab-case.
 * @returns A kebab-case formatted string.
 */
export function kebab(value: unknown): string {
    // Handle null/undefined/empty
    if (value === null || value === undefined || value === '') {
        return '';
    }

    let str: string;

    // Handle objects by stringifying them
    if (typeof value === 'object') {
        str = JSON.stringify(value);
    } else {
        // Safe cast for primitives to satisfy 'no-base-to-string' rule
        str = String(value as string | number | boolean);
    }
    
    return str
        // Convert camelCase/PascalCase to kebab-case (insert hyphen before capitals)
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        // Replace spaces and underscores with hyphens
        .replace(/[\s_]+/g, '-')
        // Convert to lowercase
        .toLowerCase();
}
