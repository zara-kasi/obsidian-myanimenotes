/**
 * Number Format Filter
 * * Formats numbers with custom decimal places, decimal point, and thousands separator
 * * Works recursively on arrays and objects
 */

import { logger } from "../../../utils/logger";

const log = new logger("NumberFormatFilter");

/**
 * A template filter that formats numbers with custom separators and decimal places.
 *
 * * Behavior:
 * - **Default**: `{{ score | number_format }}` → "8" (no decimals)
 * - **With decimals**: `{{ score | number_format:"2" }}` → "8.50"
 * - **Custom decimal point**: `{{ score | number_format:"2","," }}` → "8,50" (European style)
 * - **With thousands separator**: `{{ views | number_format:"0",".","\," }}` → "1,234,567"
 * - **Arrays/Objects**: Recursively formats all numbers
 *
 * * Parameters (comma-separated):
 * 1. Number of decimal places (default: 0)
 * 2. Decimal point character (default: ".")
 * 3. Thousands separator (default: ",")
 *
 * * Usage examples:
 * - `{{ score | number_format:"1" }}` → "8.5"
 * - `{{ mean | number_format:"2" }}` → "8.75"
 * - `{{ popularity | number_format:"0",".","\," }}` → "12,345"
 * - `{{ price | number_format:"2",",","." }}` → European format "1.234,56"
 *
 * @param value - The input value (number, string, array, or object).
 * @param param - Format parameters (decimals, decimal point, thousands separator).
 * @returns Formatted number(s) as string or JSON.
 */
export function number_format(value: unknown, param?: string): string {
    /**
     * Formats a single number with specified parameters.
     */
    const formatNumber = (
        num: number,
        decimals: number,
        decPoint: string,
        thousandsSep: string
    ): string => {
        const parts = num.toFixed(decimals).split(".");
        // Add thousands separator
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
        return parts.join(decPoint);
    };

    /**
     * Recursively processes values, formatting any numbers found.
     */
    const processValue = (
        val: unknown,
        decimals: number,
        decPoint: string,
        thousandsSep: string
    ): unknown => {
        // Handle numbers and numeric strings
        if (
            typeof val === "number" ||
            (typeof val === "string" && !isNaN(parseFloat(val)))
        ) {
            const num = typeof val === "string" ? parseFloat(val) : val;
            return formatNumber(num, decimals, decPoint, thousandsSep);
        }

        // Handle arrays recursively
        if (Array.isArray(val)) {
            return val.map(item =>
                processValue(item, decimals, decPoint, thousandsSep)
            );
        }

        // Handle objects recursively
        if (typeof val === "object" && val !== null) {
            const result: Record<string, unknown> = {};
            for (const [key, v] of Object.entries(
                val as Record<string, unknown>
            )) {
                result[key] = processValue(v, decimals, decPoint, thousandsSep);
            }
            return result;
        }

        // Return unchanged for other types
        return val;
    };

    /**
     * Unescapes special characters in separator strings.
     */
    const unescapeString = (str: string): string => {
        return str.replace(/\\(.)/g, "$1");
    };

    // Handle null/undefined/empty
    if (value === undefined || value === null || value === "") {
        return "";
    }

    try {
        let decimals = 0;
        let decPoint = ".";
        let thousandsSep = ",";

        // Parse parameters if provided
        if (param) {
            // Remove outer parentheses if present
            const cleanParam = param.replace(/^\((.*)\)$/, "$1");

            // Split parameters, respecting quotes and escapes
            const params: string[] = [];
            let current = "";
            let inQuote = false;
            let escapeNext = false;

            for (let i = 0; i < cleanParam.length; i++) {
                const char = cleanParam[i];
                if (escapeNext) {
                    current += char;
                    escapeNext = false;
                } else if (char === "\\") {
                    current += char;
                    escapeNext = true;
                } else if (char === '"' && !inQuote) {
                    inQuote = true;
                } else if (char === '"' && inQuote) {
                    inQuote = false;
                } else if (char === "," && !inQuote) {
                    params.push(current.trim());
                    current = "";
                } else {
                    current += char;
                }
            }
            if (current) {
                params.push(current.trim());
            }

            // Extract parameters
            if (params.length >= 1) {
                decimals = parseInt(params[0], 10);
            }
            if (params.length >= 2) {
                decPoint = unescapeString(
                    params[1].replace(/^["'](.*)["']$/, "$1")
                );
            }
            if (params.length >= 3) {
                thousandsSep = unescapeString(
                    params[2].replace(/^["'](.*)["']$/, "$1")
                );
            }
        }

        // Validate decimals
        if (isNaN(decimals)) {
            decimals = 0;
        }

        // Parse input
        let parsedInput: unknown;
        if (typeof value === "string") {
            try {
                parsedInput = JSON.parse(value);
            } catch {
                // If JSON parsing fails, treat input as a single value
                parsedInput = value;
            }
        } else {
            parsedInput = value;
        }

        // Process the value
        const result = processValue(
            parsedInput,
            decimals,
            decPoint,
            thousandsSep
        );

        // Return as string or JSON
        return typeof result === "string" ? result : JSON.stringify(result);
    } catch (error) {
        log.error("Error in number_format filter:", error);
        return typeof value === "string" ? value : JSON.stringify(value);
    }
}
