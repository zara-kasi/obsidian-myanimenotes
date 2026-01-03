/**
 * Snake Filter
 * * Converts text to snake_case format (lowercase with underscores)
 * * Useful for creating variable names or database-friendly identifiers
 */

/**
 * A template filter that converts text to snake_case format.
 *
 * * Behavior:
 * - **CamelCase**: "myAnimeList" → "my_anime_list"
 * - **PascalCase**: "AttackOnTitan" → "attack_on_titan"
 * - **Spaces**: "Attack on Titan" → "attack_on_titan"
 * - **Hyphens**: "my-anime-list" → "my_anime_list"
 * - **Mixed**: "My Anime-List" → "my_anime_list"
 * - **Arrays**: Processes each string element
 *
 * * Rules:
 * 1. Inserts underscore before uppercase letters following lowercase letters
 * 2. Replaces spaces and hyphens with underscores
 * 3. Converts to lowercase
 *
 * * Usage examples:
 * - `{{ "Attack on Titan" | snake }}` → "attack_on_titan"
 * - `{{ "myAnimeList" | snake }}` → "my_anime_list"
 * - `{{ "plan-to-watch" | snake }}` → "plan_to_watch"
 * - `{{ "TVSeries" | snake }}` → "tv_series"
 *
 * @param value - The input value (string or array).
 * @returns Snake_case formatted string or array of strings.
 */
export function snake(value: unknown): string | string[] {
    /**
     * Converts a single string to snake_case.
     */
    const snakeString = (str: string): string => {
        return (
            str
                // Insert underscore before uppercase letters that follow lowercase letters
                // Example: "myAnime" → "my_Anime"
                .replace(/([a-z])([A-Z])/g, "$1_$2")
                // Replace spaces and hyphens with underscores
                // Example: "my anime" → "my_anime", "my-anime" → "my_anime"
                .replace(/[\s-]+/g, "_")
                // Convert to lowercase
                .toLowerCase()
        );
    };

    // Handle null/undefined/empty
    if (value === undefined || value === null || value === "") {
        return "";
    }

    // Handle arrays - snake case each element
    if (Array.isArray(value)) {
        return value.map(item => {
            if (typeof item === "string") {
                return snakeString(item);
            }
            if (typeof item === "object" && item !== null) {
                return snakeString(JSON.stringify(item));
            }
            // Safe cast for primitives
            return snakeString(String(item as string | number | boolean));
        });
    }

    // Handle objects by stringifying
    if (typeof value === "object") {
        return snakeString(JSON.stringify(value));
    }

    // Handle strings and other primitives
    // Safe cast for primitives to satisfy 'no-base-to-string' rule
    return snakeString(String(value as string | number | boolean));
}
