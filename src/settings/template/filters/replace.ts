/**
 * Replace Filter
 * * Replaces occurrences of a substring with another string
 * * Supports regex patterns, multiple replacements, and escaped characters
 */

import { logger } from "../../../utils/logger";
import {
    createParserState,
    processCharacter,
    parseRegexPattern,
    processEscapedCharacters
} from "../scanner";

const log = new logger("ReplaceFilter");

/**
 * A template filter that replaces text within a string.
 *
 * * Behavior:
 * - **Simple replace**: `{{ title | replace:"_"," " }}` → Replaces underscores with spaces
 * - **Regex**: `{{ text | replace:"/[0-9]/g","#" }}` → Replaces all digits with #
 * - **Multiple replacements**: `{{ text | replace:"a","b","c","d" }}` → Chains replacements
 * - **Escaped chars**: `{{ text | replace:"\\n"," " }}` → Replaces newlines with spaces
 * - **Arrays**: Applies replacement to each element
 *
 * * Parameters (colon-separated pairs):
 * - search:replace - Each pair is a search and replacement
 * - Supports regex in /pattern/flags format
 * - Supports escaped characters (\n, \r, \t)
 *
 * * Usage examples:
 * - `{{ title | replace:" ","_" }}` → "Attack on Titan" becomes "Attack_on_Titan"
 * - `{{ text | replace:"/\\s+/g"," " }}` → Normalize whitespace
 * - `{{ status | replace:"watching","Currently Watching" }}` → Replace status text
 *
 * @param value - The input value to perform replacement on.
 * @param param - Search and replacement pairs (format: "search":"replace").
 * @returns The string with replacements applied.
 */
export function replace(value: unknown, param?: string): string | string[] {
    // Handle null/undefined/empty
    if (value === undefined || value === null || value === "") {
        return "";
    }

    if (!param) {
        log.debug("Replace filter requires parameters");
        // Fix: Explicitly stringify objects to avoid [object Object]
        if (typeof value === "object") {
            return JSON.stringify(value);
        }
        // Fix: Explicitly cast to primitive to satisfy no-base-to-string rule
        return String(value as string | number | boolean);
    }

    // Remove outer parentheses if present
    const cleanParam = param.replace(/^\((.*)\)$/, "$1");

    // Split into multiple replacements if commas are present
    const replacements: string[] = [];
    const state = createParserState();

    for (let i = 0; i < cleanParam.length; i++) {
        const char = cleanParam[i];

        if (
            char === "," &&
            !state.inQuote &&
            !state.inRegex &&
            state.curlyDepth === 0 &&
            state.parenDepth === 0
        ) {
            replacements.push(state.current.trim());
            state.current = "";
        } else {
            processCharacter(char, state);
        }
    }

    if (state.current) {
        replacements.push(state.current.trim());
    }

    /**
     * Applies replacements to a single string.
     */
    const applyReplacements = (str: string): string => {
        // Apply each replacement in sequence
        return replacements.reduce((acc, replacement) => {
            // Fix: Replaced regex lookbehind split with manual parsing
            let search = "";
            let replaceStr = "";
            let splitIndex = -1;

            const pairState = createParserState();

            // Find the split colon that isn't inside quotes or regex
            for (let j = 0; j < replacement.length; j++) {
                const char = replacement[j];
                if (
                    char === ":" &&
                    !pairState.inQuote &&
                    !pairState.inRegex &&
                    !pairState.escapeNext
                ) {
                    splitIndex = j;
                    break;
                }
                processCharacter(char, pairState);
            }

            if (splitIndex !== -1) {
                search = replacement.substring(0, splitIndex);
                replaceStr = replacement.substring(splitIndex + 1);
            } else {
                // Fallback: entire string is search, replace is empty
                search = replacement;
                replaceStr = "";
            }

            // Remove surrounding quotes
            search = search.trim().replace(/^["']|["']$/g, "");
            replaceStr = replaceStr.trim().replace(/^["']|["']$/g, "");

            // Check if this is a regex pattern
            const regexInfo = parseRegexPattern(search);
            if (regexInfo) {
                try {
                    // Process escaped sequences in replacement string
                    replaceStr = processEscapedCharacters(replaceStr);
                    const regex = new RegExp(
                        regexInfo.pattern,
                        regexInfo.flags
                    );
                    return acc.replace(regex, replaceStr);
                } catch (error) {
                    log.error("Invalid regex pattern:", error);
                    return acc;
                }
            }

            // Handle escaped sequences for both search and replace
            search = processEscapedCharacters(search);
            replaceStr = processEscapedCharacters(replaceStr);

            // For | and : characters, use string.split and join
            if (search === "|" || search === ":") {
                return acc.split(search).join(replaceStr);
            }

            // For literal newlines and other special characters, use split and join
            if (
                search.includes("\n") ||
                search.includes("\r") ||
                search.includes("\t")
            ) {
                return acc.split(search).join(replaceStr);
            }

            // Escape special regex characters for literal string replacement
            const searchRegex = new RegExp(
                search.replace(/([.*+?^${}()[\]\\])/g, "\\$1"),
                "g"
            );
            return acc.replace(searchRegex, replaceStr);
        }, str);
    };

    // Handle arrays
    if (Array.isArray(value)) {
        return value.map(item => {
            if (typeof item === "string") {
                return applyReplacements(item);
            }
            if (typeof item === "object" && item !== null) {
                return JSON.stringify(item);
            }
            return applyReplacements(String(item as string | number | boolean));
        });
    }

    // Handle objects
    if (typeof value === "object") {
        return applyReplacements(JSON.stringify(value));
    }

    // Handle strings and primitives
    return applyReplacements(String(value as string | number | boolean));
}
