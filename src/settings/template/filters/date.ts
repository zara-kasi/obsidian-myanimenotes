/**
 * Date Filter
 * * Formats dates using Obsidian's built-in moment.js
 */

import { moment } from "obsidian";
import { logger } from "../../../utils/logger";

const log = new logger("DateFilter");

/**
 * Formats a date value into a specified string format using Moment.js.
 */
export function date(value: unknown, format = "YYYY-MM-DD"): string {
    // Return empty string for null/undefined/empty input
    if (!value || value === "") {
        return "";
    }

    // FIX: Detect numbers (timestamps) and pass them DIRECTLY to moment.
    // This preserves milliseconds (e.g. 1767102709988) and fixes your issue.
    if (typeof value === "number") {
        return moment(value).format(format);
    }

    // Existing logic for handling string inputs (e.g. "2025-01-01")
    const dateStr = typeof value === "string" ? value : JSON.stringify(value);
    const parsed = moment(dateStr);

    // Fallback if the date string is not recognized
    if (!parsed.isValid()) {
        log.error(`Invalid date: ${dateStr}`);
        return dateStr;
    }

    return parsed.format(format);
}
