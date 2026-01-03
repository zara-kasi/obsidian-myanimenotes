/**
 * Uncamel Filter
 * * Converts camelCase and PascalCase to space-separated lowercase
 * * Useful for making programmatic names human-readable
 */

/**
 * A template filter that converts camelCase/PascalCase to space-separated lowercase.
 *
 * * Behavior:
 * - **camelCase**: "myAnimeList" → "my anime list"
 * - **PascalCase**: "AttackOnTitan" → "attack on titan"
 * - **Acronyms**: "XMLHttpRequest" → "xml http request"
 * - **Numbers**: "season2Episode24" → "season 2 episode 24"
 * - **Arrays**: Processes each string element
 *
 * * Rules:
 * 1. Adds space before uppercase letters that follow lowercase letters or numbers
 * 2. Adds space before uppercase letters in acronym sequences (e.g., "XMLParser" → "xml parser")
 * 3. Converts entire result to lowercase
 *
 * * Usage examples:
 * - `{{ "myAnimeList" | uncamel }}` → "my anime list"
 * - `{{ "AttackOnTitan" | uncamel }}` → "attack on titan"
 * - `{{ "planToWatch" | uncamel }}` → "plan to watch"
 * - `{{ "TVSeries" | uncamel }}` → "tv series"
 *
 * @param value - The input value (camelCase/PascalCase string or array).
 * @returns Space-separated lowercase string or array of strings.
 */
export function uncamel(value: unknown): string | string[] {
    /**
     * Converts a single camelCase/PascalCase string to spaced lowercase.
     */
    const uncamelString = (str: string): string => {
        // Add space before any uppercase letter that follows a lowercase letter or number
        // Example: "myAnime" → "my Anime", "season2" → "season 2"
        let spaced = str.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

        // Add space before any uppercase letter that follows another uppercase letter
        // and is followed by a lowercase letter (handles acronyms)
        // Example: "XMLParser" → "XML Parser"
        spaced = spaced.replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");

        // Convert to lowercase
        return spaced.toLowerCase();
    };

    // Handle null/undefined/empty
    if (value === undefined || value === null || value === "") {
        return "";
    }

    // Handle arrays - uncamel each element
    if (Array.isArray(value)) {
        return value.map(item => {
            if (typeof item === "string") {
                return uncamelString(item);
            }
            if (typeof item === "object" && item !== null) {
                return uncamelString(JSON.stringify(item));
            }
            // Safe cast for primitives
            return uncamelString(String(item as string | number | boolean));
        });
    }

    // Handle objects by stringifying
    if (typeof value === "object") {
        return uncamelString(JSON.stringify(value));
    }

    // Handle strings and other primitives
    // Safe cast for primitives to satisfy 'no-base-to-string' rule
    return uncamelString(String(value as string | number | boolean));
}
