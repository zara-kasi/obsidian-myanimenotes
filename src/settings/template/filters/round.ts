/**
 * Round Filter
 * * Rounds numeric values to specified decimal places
 * * Recursively processes arrays and objects
 */

import { logger } from "../../../utils/logger";

const log = new logger("RoundFilter");

/**
 * A template filter that rounds numeric values to a specified number of decimal places.
 *
 * * Behavior:
 * - **No parameter**: Rounds to nearest integer (e.g., 8.7 → 9)
 * - **With parameter**: Rounds to specified decimal places (e.g., 8.765 with "2" → 8.77)
 * - **Arrays**: Recursively rounds all numeric values in the array
 * - **Objects**: Recursively rounds all numeric values in the object
 * - **Non-numeric**: Returns unchanged (strings, booleans, etc.)
 *
 * * Usage examples:
 * - `{{ score | round }}` → 8.7 becomes "9"
 * - `{{ mean | round:"2" }}` → 8.765 becomes "8.77"
 * - `{{ scores | round:"1" }}` → [8.65, 7.89] becomes [8.7, 7.9]
 * - `{{ statistics | round:"2" }}` → Rounds all numbers in object
 *
 * @param value - The input value (number, string, array, object, or JSON string).
 * @param param - Optional decimal places (default: 0 for integer rounding).
 * @returns Rounded value as string or JSON string.
 */
export function round(value: unknown, param?: string): string {
    /**
     * Rounds a single number to specified decimal places.
     */
    const roundNumber = (num: number, decimalPlaces?: number): number => {
        if (decimalPlaces === undefined) {
            return Math.round(num);
        }
        const factor = Math.pow(10, decimalPlaces);
        return Math.round(num * factor) / factor;
    };

    /**
     * Recursively processes values, rounding any numbers found.
     */
    const processValue = (val: unknown, decimalPlaces?: number): unknown => {
        // Handle numbers directly
        if (typeof val === "number") {
            return roundNumber(val, decimalPlaces);
        }

        // Handle numeric strings
        if (typeof val === "string") {
            const num = parseFloat(val);
            return isNaN(num)
                ? val
                : roundNumber(num, decimalPlaces).toString();
        }

        // Handle arrays recursively
        if (Array.isArray(val)) {
            return val.map(item => processValue(item, decimalPlaces));
        }

        // Handle objects recursively
        if (typeof val === "object" && val !== null) {
            const result: Record<string, unknown> = {};
            for (const [key, v] of Object.entries(
                val as Record<string, unknown>
            )) {
                result[key] = processValue(v, decimalPlaces);
            }
            return result;
        }

        // Return other types unchanged (booleans, null, undefined)
        return val;
    };

    try {
        // Parse decimal places parameter
        let decimalPlaces: number | undefined;
        if (param !== undefined) {
            const parsed = parseInt(param, 10);
            if (isNaN(parsed)) {
                log.debug("Invalid decimal places parameter:", param);
                return typeof value === "string"
                    ? value
                    : JSON.stringify(value);
            }
            decimalPlaces = parsed;
        }

        let data: unknown;

        // Try to parse JSON if it's a string
        if (typeof value === "string") {
            try {
                data = JSON.parse(value);
            } catch {
                // If JSON parsing fails, treat as a single value
                data = value;
            }
        } else {
            data = value;
        }

        // Process the value
        const result = processValue(data, decimalPlaces);

        // Return as appropriate type
        return typeof result === "string" ? result : JSON.stringify(result);
    } catch (error) {
        log.error("Error in round filter:", error);
        return typeof value === "string" ? value : JSON.stringify(value);
    }
}
