/**
 * Footnote Filter
 * * Converts arrays or objects into Markdown footnote format
 * * Useful for adding reference notes at the bottom of documents
 */

/**
 * A template filter that converts data into Markdown footnote format.
 * * * Behavior:
 * - **Arrays**: Creates numbered footnotes [^1], [^2], etc.
 * - **Objects**: Creates named footnotes using keys [^key-name]
 * - **Strings**: Returns as-is
 * * * Format:
 * - Arrays: `[^1]: First item`, `[^2]: Second item`
 * - Objects: `[^property-name]: value`
 * * * Usage examples:
 * - `{{ genres | footnote }}` → Creates footnotes from genre list
 * - `{{ metadata | footnote }}` → Creates footnotes from metadata object
 * * @param value - The input value (array, object, or string).
 * @returns Formatted footnote text, or original value if not processable.
 */
export function footnote(value: unknown): string {
    // Handle null/undefined/empty
    if (value === null || value === undefined || value === "") {
        return "";
    }

    // Helper to safely convert values to string
    const safeStringify = (val: unknown): string => {
        if (typeof val === "object" && val !== null) {
            return JSON.stringify(val);
        }
        return String(val as string | number | boolean);
    };

    // Handle arrays directly
    if (Array.isArray(value)) {
        return (value as unknown[])
            .map((item, index) => `[^${index + 1}]: ${safeStringify(item)}`)
            .join("\n\n");
    }

    // Handle objects directly
    if (typeof value === "object") {
        return Object.entries(value as Record<string, unknown>)
            .map(([key, val]) => {
                // Convert camelCase/PascalCase/snake_case to kebab-case for footnote IDs
                const footnoteId = key
                    .replace(/([a-z])([A-Z])/g, "$1-$2") // camelCase to kebab-case
                    .replace(/[\s_]+/g, "-") // spaces/underscores to hyphens
                    .toLowerCase();
                return `[^${footnoteId}]: ${safeStringify(val)}`;
            })
            .join("\n\n");
    }

    // Fallback for strings and other primitives
    return safeStringify(value);
}
