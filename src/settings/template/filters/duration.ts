/**
 * Duration Filter
 * * Formats duration strings (ISO 8601 or seconds) into readable time formats
 * * Supports custom output formats like HH:mm:ss
 */

import { moment } from "obsidian";
import { logger } from "../../../utils/logger";

const log = new logger("DurationFilter");

/**
 * A template filter that formats duration values into readable time strings.
 *
 * * Behavior:
 * - **ISO 8601**: `"PT1H30M"` → `"01:30:00"` (1 hour 30 minutes)
 * - **Seconds**: `"3600"` → `"01:00:00"` (1 hour)
 * - **Minutes**: `"90"` (as seconds) → `"01:30"` (90 seconds = 1:30)
 * - **Custom format**: Can specify output format like "HH:mm:ss" or "mm:ss"
 *
 * * Supported ISO 8601 format:
 * - P{years}Y{months}M{days}DT{hours}H{minutes}M{seconds}S
 * - Example: "PT2H30M" = 2 hours 30 minutes
 *
 * * Format tokens:
 * - HH: Hours (padded with zero, e.g., "01")
 * - H: Hours (no padding, e.g., "1")
 * - mm: Minutes (padded)
 * - m: Minutes (no padding)
 * - ss: Seconds (padded)
 * - s: Seconds (no padding)
 *
 * * Usage examples:
 * - `{{ duration | duration }}` → Auto format based on length
 * - `{{ duration | duration:"HH:mm:ss" }}` → "01:30:45"
 * - `{{ duration | duration:"mm:ss" }}` → "90:45"
 *
 * @param value - The input duration (ISO 8601 string or seconds as string/number).
 * @param param - Optional format string (e.g., "HH:mm:ss", "mm:ss").
 * @returns Formatted duration string, or original value if parsing fails.
 */
export function duration(value: unknown, param?: string): string {
    // 1. Handle empty input immediately
    if (value === undefined || value === null || value === '') {
        return '';
    }

    // 2. Safe string conversion to satisfy linter
    let str: string;
    if (typeof value === 'object') {
        str = JSON.stringify(value).replace(/^"|"$/g, '');
    } else {
        str = String(value as string | number | boolean);
    }

    try {
        // Remove outer quotes if present
        const cleanStr = str.replace(/^["'](.*)["']$/, "$1");

        // Parse ISO 8601 duration string (e.g., "PT1H30M" or "P1DT2H30M15S")
        const matches = cleanStr.match(
            /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/
        );

        let dur: moment.Duration;

        if (matches) {
            // Parse ISO 8601 format
            const [, years, months, days, hours, minutes, seconds] = matches;

            dur = moment.duration({
                years: years ? parseInt(years) : 0,
                months: months ? parseInt(months) : 0,
                days: days ? parseInt(days) : 0,
                hours: hours ? parseInt(hours) : 0,
                minutes: minutes ? parseInt(minutes) : 0,
                seconds: seconds ? parseInt(seconds) : 0
            });
        } else {
            // Try parsing as seconds if it's just a number
            const seconds = parseInt(cleanStr, 10);
            if (!isNaN(seconds)) {
                dur = moment.duration(seconds, "seconds");
            } else {
                log.debug("Invalid duration format:", cleanStr);
                return str;
            }
        }

        return formatDuration(dur, param);
    } catch (error) {
        log.error("Error in duration filter:", error);
        return str;
    }
}

/**
 * Formats a moment.Duration object into a string based on the provided format.
 *
 * @param dur - The moment.Duration object to format.
 * @param format - Optional format string (e.g., "HH:mm:ss").
 * @returns Formatted duration string.
 */
function formatDuration(dur: moment.Duration, format?: string): string {
    let outputFormat = format;

    if (!outputFormat) {
        // Default format based on duration length
        if (dur.asHours() >= 1) {
            outputFormat = "HH:mm:ss";
        } else {
            outputFormat = "mm:ss";
        }
    }

    // Remove outer quotes and parentheses if present
    outputFormat = outputFormat.replace(/^["'(](.*)["')]$/, "$1");

    // Calculate components
    const hours = Math.floor(dur.asHours());
    const minutes = dur.minutes();
    const seconds = dur.seconds();

    // Create token replacement map
    const parts: Record<string, string> = {
        HH: padZero(hours),
        H: hours.toString(),
        mm: padZero(minutes),
        m: minutes.toString(),
        ss: padZero(seconds),
        s: seconds.toString()
    };

    // Replace tokens in format string
    return outputFormat.replace(/HH|H|mm|m|ss|s/g, match => parts[match]);
}

/**
 * Pads a number with a leading zero if it's less than 10.
 *
 * @param num - The number to pad.
 * @returns Padded string (e.g., "01", "09", "10").
 */
function padZero(num: number): string {
    return num.toString().padStart(2, "0");
}
