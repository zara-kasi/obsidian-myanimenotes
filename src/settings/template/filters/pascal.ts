/**
 * Pascal Filter
 * * Converts text to PascalCase format
 * * Similar to camelCase but first letter is capitalized
 */

/**
 * A template filter that converts text to PascalCase format.
 *
 * * Behavior:
 * - **Spaces**: "hello world" → "HelloWorld"
 * - **Hyphens**: "my-anime-list" → "MyAnimeList"
 * - **Underscores**: "user_status" → "UserStatus"
 * - **Mixed**: "attack on-titan" → "AttackOnTitan"
 * - **Already PascalCase**: "PascalCase" → "PascalCase"
 *
 * * Usage examples:
 * - `{{ title | pascal }}` → "AttackOnTitan"
 * - `{{ mediaType | pascal }}` → "TvSpecial"
 * - `{{ userStatus | pascal }}` → "PlanToWatch"
 *
 * @param value - The input value to convert to PascalCase.
 * @returns A PascalCase formatted string.
 */
export function pascal(value: unknown): string {
    // Handle null/undefined/empty
    if (value === undefined || value === null || value === "") {
        return "";
    }

    let str: string;

    // Handle objects by stringifying them
    if (typeof value === "object") {
        str = JSON.stringify(value);
    } else {
        // Safe cast for primitives to satisfy 'no-base-to-string' rule
        str = String(value as string | number | boolean);
    }

    return (
        str
            // Replace spaces, hyphens, underscores followed by a character with uppercase character
            // Fix: Explicitly type callback arguments and return type
            .replace(/[\s_-]+(.)/g, (_, c: string): string => c.toUpperCase())
            // Capitalize the first character
            // Fix: Explicitly type callback arguments and return type
            .replace(/^(.)/, (c: string): string => c.toUpperCase())
    );
}
