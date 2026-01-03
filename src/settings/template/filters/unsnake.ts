/**
 * Unsnake Filter
 * * Converts snake_case or kebab-case text to space-separated text
 * * Useful for making database identifiers human-readable
 */

/**
 * A template filter that converts snake_case or kebab-case strings to space-separated text.
 *
 * * Behavior:
 * - **Snake Case**: "my_anime_list" → "my anime list"
 * - **Kebab Case**: "attack-on-titan" → "attack on titan"
 * - **Mixed**: "plan_to-watch" → "plan to watch"
 * - **Arrays**: Processes each string element
 *
 * * Rules:
 * 1. Replaces underscores and hyphens with spaces
 * 2. Preserves existing capitalization (allows chaining with | capitalize)
 *
 * * Usage examples:
 * - `{{ "attack_on_titan" | unsnake }}` → "attack on titan"
 * - `{{ "my_anime_list" | unsnake | capitalize }}` → "My anime list"
 *
 * @param value - The input value (string or array).
 * @returns Space-separated string or array of strings.
 */
export function unsnake(value: unknown): string | string[] {
    /**
     * Converts a single string from snake/kebab case to space-separated text.
     */
    const unsnakeString = (str: string): string => {
        return (
            str
                // Replace underscores and hyphens with spaces
                // Example: "my_anime" → "my anime", "my-anime" → "my anime"
                .replace(/[_-]+/g, " ")
        );
    };

    // Handle null/undefined/empty
    if (value === undefined || value === null || value === "") {
        return "";
    }

    // Handle arrays - unsnake each element
    if (Array.isArray(value)) {
        return value.map(item => {
            if (typeof item === "string") {
                return unsnakeString(item);
            }
            if (typeof item === "object" && item !== null) {
                return unsnakeString(JSON.stringify(item));
            }
            // Safe cast for primitives
            return unsnakeString(String(item as string | number | boolean));
        });
    }

    // Handle objects by stringifying
    if (typeof value === "object") {
        return unsnakeString(JSON.stringify(value));
    }

    // Handle strings and other primitives
    // Safe cast for primitives to satisfy 'no-base-to-string' rule
    return unsnakeString(String(value as string | number | boolean));
}
