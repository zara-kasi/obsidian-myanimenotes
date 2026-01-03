/**
 * Title Filter
 * * Converts text to Title Case (capitalizes major words)
 * * Keeps minor words lowercase (articles, conjunctions, prepositions)
 * * Recursively processes arrays and objects
 */

import { logger } from "../../../utils/logger";

const log = new logger("TitleFilter");

// TODO: Consider implementing multi-language support for title casing
// Current implementation is English-specific
const LOWERCASE_WORDS = [
    "a",
    "an",
    "the", // Articles
    "and",
    "but",
    "or",
    "nor", // Conjunctions
    "for",
    "on",
    "at",
    "to", // Prepositions
    "from",
    "by",
    "in",
    "of"
];

/**
 * A template filter that converts text to Title Case.
 *
 * * Behavior:
 * - **Strings**: Capitalizes first letter of each major word
 * - **Minor words**: Keeps articles, conjunctions, prepositions lowercase (except first word)
 * - **Arrays**: Recursively processes each element
 * - **Objects**: Converts both keys and string values to title case
 *
 * * Rules:
 * - First word is always capitalized
 * - Minor words (a, an, the, and, but, or, for, etc.) are lowercase
 * - All other words are capitalized
 *
 * * Minor words kept lowercase:
 * - Articles: a, an, the
 * - Conjunctions: and, but, or, nor
 * - Prepositions: for, on, at, to, from, by, in, of
 *
 * * Usage examples:
 * - `{{ "attack on titan" | title }}` → "Attack on Titan"
 * - `{{ "the lord of the rings" | title }}` → "The Lord of the Rings"
 * - `{{ "a tale of two cities" | title }}` → "A Tale of Two Cities"
 * - `{{ genres | title }}` → ["Action", "Fantasy"] (array processing)
 *
 * @param value - The input value (string, array, object, or JSON string).
 * @param param - Optional parameter (currently unused, reserved for future features).
 * @returns Title-cased string, array, or JSON string.
 */
export function title(value: unknown, param?: string): string | string[] {
    /**
     * Converts a single string to Title Case.
     */
    const toTitleCase = (str: string): string => {
        return str
            .split(/\s+/)
            .map((word, index) => {
                // First word is always capitalized
                if (index === 0) {
                    return (
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                    );
                }

                // Keep minor words lowercase
                if (LOWERCASE_WORDS.includes(word.toLowerCase())) {
                    return word.toLowerCase();
                }

                // Capitalize all other words
                return (
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                );
            })
            .join(" ");
    };

    /**
     * Recursively processes values, converting strings to title case.
     */
    const processValue = (val: unknown): unknown => {
        if (typeof val === "string") {
            return toTitleCase(val);
        }

        if (Array.isArray(val)) {
            return val.map(processValue);
        }

        if (typeof val === "object" && val !== null) {
            const result: Record<string, unknown> = {};
            for (const [key, v] of Object.entries(
                val as Record<string, unknown>
            )) {
                // Convert both keys and values
                result[toTitleCase(key)] = processValue(v);
            }
            return result;
        }

        return val;
    };

    // Handle null/undefined/empty
    if (value === undefined || value === null || value === "") {
        return "";
    }

    try {
        // Try to parse as JSON if it's a string
        if (typeof value === "string") {
            try {
                // Fix: Explicitly cast JSON.parse result to unknown to avoid 'any'
                const parsed = JSON.parse(value) as unknown;
                const result = processValue(parsed);
                return JSON.stringify(result);
            } catch {
                // If parsing fails, treat as plain string
                return processValue(value) as string;
            }
        }

        // Process non-string values directly
        const result = processValue(value);

        // Return appropriate type
        if (typeof result === "string") {
            return result;
        }
        if (
            Array.isArray(result) &&
            // Fix: Use type predicate so TypeScript knows this is a string[]
            result.every((item): item is string => typeof item === "string")
        ) {
            return result;
        }
        return JSON.stringify(result);
    } catch (error) {
        log.error("Error in title filter:", error);
        return typeof value === "string" ? value : JSON.stringify(value);
    }
}
