/**
 * Filter Metadata
 * Provides descriptions and argument hints for template filters
 * Used by UI components like the Suggester for autocomplete
 */

export interface FilterMetadata {
    /** The actual filter name used in the template (e.g., "wikilink") */
    name: string;
    /** A short, user-friendly description of what the filter does (max 10 words ideally) */
    description: string;
    /** Optional: A hint for arguments to show in the UI (e.g., ":separator" or ":format") */
    argumentHint?: string;
}

export const FILTER_DEFINITIONS: FilterMetadata[] = [
    {
        name: "wikilink",
        description: "Wraps values in Obsidian wikilink syntax [[value]]"
    },
    {
        name: "join",
        description: "Joins array elements with a separator",
        argumentHint: ":separator"
    },
    {
        name: "date",
        description: "Formats dates using moment.js format strings",
        argumentHint: ":format"
    },
    {
        name: "split",
        description: "Splits a string into an array",
        argumentHint: ":separator"
    },
    {
        name: "default",
        description: "Provides fallback value if input is empty",
        argumentHint: ":fallback"
    },
    {
        name: "lower",
        description: "Converts text to lowercase"
    },
    {
        name: "upper",
        description: "Converts text to uppercase"
    },
    {
        name: "blockquote",
        description: "Converts text into Markdown blockquotes with > prefix"
    },
    {
        name: "calc",
        description: "Performs mathematical operations on numeric values",
        argumentHint: ":operation"
    },
    {
        name: "callout",
        description: "Wraps text in Obsidian callout blocks",
        argumentHint: ":type,title,foldState"
    },
    {
        name: "camel",
        description: "Converts text to camelCase format"
    },
    {
        name: "capitalize",
        description: "Capitalizes first letter, rest lowercase"
    },
    {
        name: "date_modify",
        description: "Adds or subtracts time from a date",
        argumentHint: ":modifier"
    },
    {
        name: "duration",
        description: "Formats duration strings into readable time formats",
        argumentHint: ":format"
    },
    {
        name: "first",
        description: "Returns the first element of an array"
    },
    {
        name: "footnote",
        description: "Converts arrays or objects into Markdown footnote format"
    },
    {
        name: "kebab",
        description: "Converts text to kebab-case format"
    },
    {
        name: "last",
        description: "Returns the last element of an array"
    },
    {
        name: "length",
        description: "Returns the length or count of the value"
    },
    {
        name: "list",
        description: "Converts arrays into Markdown list formats",
        argumentHint: ":type"
    },
    {
        name: "map",
        description: "Transforms array elements using arrow function syntax",
        argumentHint: ":expression"
    },
    {
        name: "merge",
        description: "Combines arrays or adds items to an array",
        argumentHint: ":items"
    },
    {
        name: "nth",
        description: "Selects elements at specific positions in array",
        argumentHint: ":pattern"
    },
    {
        name: "number_format",
        description: "Formats numbers with custom separators and decimals",
        argumentHint: ":decimals,decPoint,thousandsSep"
    },
    {
        name: "object",
        description: "Extracts keys, values, or entries from objects",
        argumentHint: ":mode"
    },
    {
        name: "pascal",
        description: "Converts text to PascalCase format"
    },
    {
        name: "replace",
        description: "Replaces text or regex patterns with replacement",
        argumentHint: ":find,replace"
    },
    {
        name: "reverse",
        description: "Reverses order of arrays, objects, or string characters"
    },
    {
        name: "round",
        description: "Rounds numeric values to specified decimal places",
        argumentHint: ":decimals"
    },
    {
        name: "safe_name",
        description: "Sanitizes strings for valid file/folder names",
        argumentHint: ":platform"
    },
    {
        name: "slice",
        description: "Extracts a portion of an array or string",
        argumentHint: ":start,end"
    },
    {
        name: "snake",
        description: "Converts text to snake_case format"
    },
    {
        name: "unsnake",
        description: "Converts snake_case or kebab-case to space-separated text"
    },
    {
        name: "table",
        description: "Converts JSON data into Markdown tables",
        argumentHint: ":headers"
    },
    {
        name: "template",
        description: "Formats data using custom template strings with variables",
        argumentHint: ":template"
    },
    {
        name: "title",
        description: "Converts text to Title Case"
    },
    {
        name: "trim",
        description: "Removes leading and trailing whitespace"
    },
    {
        name: "uncamel",
        description: "Converts camelCase to space-separated lowercase"
    },
    {
        name: "unique",
        description: "Removes duplicate values from arrays and objects"
    }
];

/**
 * Get metadata for a specific filter by name
 */
export function getFilterMetadata(filterName: string): FilterMetadata | undefined {
    return FILTER_DEFINITIONS.find(f => f.name === filterName);
}

/**
 * Get all filter names
 */
export function getFilterNames(): string[] {
    return FILTER_DEFINITIONS.map(f => f.name);
}

/**
 * Search filters by name or description
 */
export function searchFilters(query: string): FilterMetadata[] {
    const lowerQuery = query.toLowerCase();
    return FILTER_DEFINITIONS.filter(f => 
        f.name.toLowerCase().includes(lowerQuery) || 
        f.description.toLowerCase().includes(lowerQuery)
    );
}