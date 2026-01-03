/**
 * Blockquote Filter
 * * Converts text into Markdown blockquotes with > prefix
 * * Supports nested arrays for multi-level blockquotes
 */

export function blockquote(value: unknown, param?: string): string {
    // Return empty string for null/undefined/empty input
    if (value === undefined || value === null || value === "") {
        return "";
    }

    /**
     * Processes a single string value into a blockquote.
     * @param str - The string to process
     * @param depth - The blockquote nesting level (1 = >, 2 = >>, etc.)
     */
    const processBlockquote = (str: string, depth: number = 1): string => {
        const prefix = "> ".repeat(depth);
        return str
            .split("\n")
            .map(line => `${prefix}${line}`)
            .join("\n");
    };

    /**
     * Processes an array, creating nested blockquotes for nested arrays.
     * @param arr - The array to process
     * @param depth - Current nesting depth
     */
    const processArray = (arr: unknown[], depth: number = 1): string => {
        return arr
            .map(item => {
                // Handle nested arrays by increasing depth
                if (Array.isArray(item)) {
                    return processArray(item, depth + 1);
                }

                // Handle objects inside arrays
                if (typeof item === "object" && item !== null) {
                    return processBlockquote(
                        JSON.stringify(item, null, 2),
                        depth
                    );
                }

                // Convert each item to string and apply blockquote
                // Cast avoids 'no-base-to-string' error since objects are already handled
                return processBlockquote(
                    String(item as string | number | boolean),
                    depth
                );
            })
            .join("\n");
    };

    // Handle arrays directly
    if (Array.isArray(value)) {
        return processArray(value);
    }

    // Handle objects by stringifying them first
    if (typeof value === "object" && value !== null) {
        return processBlockquote(JSON.stringify(value, null, 2));
    }

    // Handle all other types (strings, numbers, booleans)
    // Cast avoids 'no-base-to-string' error
    return processBlockquote(String(value as string | number | boolean));
}
