/**
 * Parser Utilities
 * * Helper functions for parsing complex filter parameters
 * * Handles quoted strings, regex patterns, and nested structures
 */

/**
 * Parser state for tracking parsing context
 */
export interface ParserState {
    current: string;
    inQuote: boolean;
    quoteChar: string;
    inRegex: boolean;
    escapeNext: boolean;
    curlyDepth: number;
    parenDepth: number;
}

/**
 * Creates a new parser state with default values.
 */
export function createParserState(): ParserState {
    return {
        current: "",
        inQuote: false,
        quoteChar: "",
        inRegex: false,
        escapeNext: false,
        curlyDepth: 0,
        parenDepth: 0
    };
}

/**
 * Processes a single character and updates parser state.
 */
export function processCharacter(char: string, state: ParserState): void {
    if (state.escapeNext) {
        state.current += char;
        state.escapeNext = false;
        return;
    }

    if (char === "\\") {
        state.current += char;
        state.escapeNext = true;
        return;
    }

    // Handle quotes
    if ((char === '"' || char === "'") && !state.inRegex) {
        if (!state.inQuote) {
            state.inQuote = true;
            state.quoteChar = char;
        } else if (char === state.quoteChar) {
            state.inQuote = false;
            state.quoteChar = "";
        }
        state.current += char;
        return;
    }

    // Handle regex patterns
    if (char === "/" && !state.inQuote) {
        if (!state.inRegex) {
            state.inRegex = true;
        } else {
            state.inRegex = false;
        }
        state.current += char;
        return;
    }

    // Track nesting depth
    if (!state.inQuote && !state.inRegex) {
        if (char === "{") state.curlyDepth++;
        if (char === "}") state.curlyDepth--;
        if (char === "(") state.parenDepth++;
        if (char === ")") state.parenDepth--;
    }

    state.current += char;
}

/**
 * Regex pattern information
 */
export interface RegexInfo {
    pattern: string;
    flags: string;
}

/**
 * Parses a regex pattern in the format /pattern/flags.
 */
export function parseRegexPattern(str: string): RegexInfo | null {
    const match = str.match(/^\/(.+?)\/([gimsuvy]*)$/);
    if (match) {
        return {
            pattern: match[1],
            flags: match[2] || ""
        };
    }
    return null;
}

/**
 * Processes escaped characters in a string.
 */
export function processEscapedCharacters(str: string): string {
    // Fix: Explicitly type callback arguments to avoid 'any' inference
    return str.replace(/\\([nrt]|[^nrt])/g, (match: string, char: string): string => {
        switch (char) {
            case "n":
                return "\n";
            case "r":
                return "\r";
            case "t":
                return "\t";
            default:
                return char;
        }
    });
}
