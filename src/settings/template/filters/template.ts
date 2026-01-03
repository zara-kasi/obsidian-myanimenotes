/**
 * Template Filter
 * * Formats data using custom template strings with variable substitution
 * * Supports nested property access with dot notation
 */

import { logger } from "../../../utils/logger";

const log = new logger("TemplateFilter");

/**
 * A template filter that formats data using custom template strings.
 *
 * * Behavior:
 * - **Variable substitution**: `${propertyName}` gets replaced with actual values
 * - **Nested properties**: `${studio.name}` accesses nested objects
 * - **Array processing**: Maps template over each array element
 * - **Newline support**: `\n` in templates becomes actual line breaks
 * - **Empty value removal**: Lines with undefined values are removed
 *
 * * Template syntax:
 * - `${property}` - Simple property access
 * - `${nested.property}` - Nested property with dot notation
 * - `\n` - Line break in output
 *
 * * Usage examples:
 * - `{{ studios | template:"Studio: ${name}" }}` → "Studio: MAPPA"
 * - `{{ genres | template:"Genre: ${name}\nType: ${type}" }}` → Multi-line per item
 * - `{{ metadata | template:"${key}: ${value}" }}` → Custom formatting
 *
 * @param value - The input value (object, array, or JSON string).
 * @param param - The template string with ${variable} placeholders.
 * @returns Formatted string with variables replaced.
 */
export function template(value: unknown, param?: string): string {
    log.debug("Template input:", value);
    log.debug("Template param:", param);

    // Require template parameter
    if (!param) {
        log.debug("No param provided, returning input");
        return typeof value === "string" ? value : JSON.stringify(value);
    }

    // Clean up parameter
    // Remove outer parentheses if present
    let cleanParam = param.replace(/^\((.*)\)$/, "$1");
    // Remove surrounding quotes (both single and double)
    cleanParam = cleanParam.replace(/^(['"])(.*)\1$/, "$2");

    let dataArray: unknown[] = [];

    // Parse input if it's a string
    if (typeof value === "string") {
        try {
            // Fix: Cast JSON.parse result to unknown to avoid 'any'
            const parsed = JSON.parse(value) as unknown;
            dataArray = Array.isArray(parsed) ? parsed : [parsed];
            log.debug("Parsed input:", dataArray);
        } catch {
            // If parsing fails, treat as single string value
            log.debug("Parsing failed, using input as is");
            dataArray = [value];
        }
    } else if (value === null || value === undefined) {
        return "";
    } else {
        // Ensure we have an array
        dataArray = Array.isArray(value) ? value : [value];
    }

    log.debug("Data array to process:", dataArray);

    // Map template over each item
    const result = dataArray
        .map(item => replaceTemplateVariables(item, cleanParam))
        .filter(str => str.trim() !== "") // Remove empty results
        .join("\n\n");

    log.debug("Processing result:", result);
    return result;
}

/**
 * Replaces template variables in a string with actual values from an object.
 *
 * @param obj - The data object containing values
 * @param templateStr - The template string with ${variable} placeholders
 * @returns Formatted string with variables replaced
 */
function replaceTemplateVariables(obj: unknown, templateStr: string): string {
    log.debug("Replacing template variables for:", obj);
    log.debug("Template:", templateStr);

    // If obj is a string that looks like an object, try to parse it
    if (typeof obj === "string") {
        try {
            obj = parseObjectString(obj);
            log.debug("Parsed object:", obj);
        } catch {
            log.debug("Failed to parse object string:", obj);
        }
    }

    // Replace ${property} and ${nested.property} patterns
    // Fix: Explicitly type match and path as string to avoid implicit 'any' error
    let result = templateStr.replace(
        /\$\{([\w.]+)\}/g,
        (match: string, path: string) => {
            log.debug("Replacing:", match);
            const val: unknown = getNestedProperty(obj, path);

            // Fix: Explicitly type debugValue and safely cast 'val' to primitives
            let debugValue: string = "";

            if (val === undefined) {
                debugValue = "undefined";
            } else if (val === null) {
                debugValue = "null";
            } else if (typeof val === "object") {
                // Explicitly cast to unknown before stringify to avoid any unsafe argument checks
                debugValue = JSON.stringify(val as unknown);
            } else {
                // Fix: Cast to primitives to satisfy no-base-to-string rule
                debugValue = String(val as string | number | boolean);
            }

            log.debug("Replaced with:", debugValue);

            if (val === undefined || val === "undefined") {
                return "";
            }

            // Handle object stringification and safe primitive casting for return value
            if (typeof val === "object" && val !== null) {
                return JSON.stringify(val);
            }
            return String(val as string | number | boolean);
        }
    );

    // Handle the case where obj has a 'str' property (common pattern)
    if (typeof obj === "object" && obj !== null && "str" in obj) {
        const objWithStr = obj as Record<string, unknown>;
        result = result.replace(/\$\{str\}/g, String(objWithStr.str));
    }

    log.debug("Result after variable replacement:", result);

    // Replace \n with actual newlines
    result = result.replace(/\\n/g, "\n");
    log.debug("Result after newline replacement:", result);

    // Remove any empty lines (which might be caused by undefined values)
    result = result
        .split("\n")
        .filter(line => line.trim() !== "")
        .join("\n");
    log.debug("Result after empty line removal:", result);

    return result.trim();
}

/**
 * Parses a string representation of an object into an actual object.
 * Handles simple key:value pairs separated by commas.
 *
 * @param str - String like "name: MAPPA, type: studio"
 * @returns Parsed object
 */
function parseObjectString(str: string): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    const regex = /(\w+):\s*("(?:\\.|[^"\\])*"|[^,}]+)/g;
    let match;

    while ((match = regex.exec(str)) !== null) {
        let [, key, val] = match;

        // Remove quotes from the value if it's a string
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }

        obj[key] = val === "undefined" ? undefined : val;
    }

    return obj;
}

/**
 * Gets a nested property from an object using dot notation.
 *
 * @param obj - The object to search in
 * @param path - Dot-separated path like "studio.name"
 * @returns The value at that path, or undefined
 */
function getNestedProperty(obj: unknown, path: string): unknown {
    log.debug("Getting nested property:", { obj, path });

    const result = path.split(".").reduce((current: unknown, key: string) => {
        if (current && typeof current === "object") {
            return (current as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);

    log.debug("Nested property result:", result);
    return result;
}
