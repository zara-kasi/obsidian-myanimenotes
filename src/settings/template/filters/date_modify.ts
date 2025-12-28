/**
 * Date Modify Filter
 * * Adds or subtracts time from a date
 * * Supports various units: days, weeks, months, years, etc.
 */

import { moment } from 'obsidian';
import { logger } from '../../../utils/logger';

const log = new logger('DateModifyFilter');

/**
 * A template filter that modifies a date by adding or subtracting time.
 * * * Behavior:
 * - **Add time**: `{{ userStartDate | date_modify:"+7 days" }}` → Adds 7 days
 * - **Subtract time**: `{{ userFinishDate | date_modify:"-1 month" }}` → Subtracts 1 month
 * - **Various units**: days, weeks, months, years, hours, minutes, seconds
 * - **Plural forms**: "day" or "days", "month" or "months" both work
 * * * Supported units:
 * - years, months, weeks, days
 * - hours, minutes, seconds
 * - milliseconds (ms)
 * * * Format: `"+/-{amount} {unit}"` or `"+/-{amount}{unit}"`
 * * * Usage examples:
 * - `{{ userStartDate | date_modify:"+1 week" }}`
 * - `{{ releasedStart | date_modify:"-3 months" }}`
 * - `{{ userFinishDate | date_modify:"+30days" }}`
 * * @param value - The input date (string, ISO format, etc.).
 * @param param - The modification parameter (e.g., "+7 days", "-1 month").
 * @returns The modified date in YYYY-MM-DD format, or original value if invalid.
 */
export function date_modify(value: unknown, param?: string): string {
    // 1. Handle empty input immediately
    if (value === undefined || value === null || value === '') {
        return '';
    }

    // 2. Safe conversion to string to satisfy linter
    let str: string;
    if (typeof value === 'object') {
        // If it's a Date object (common), stringify handles it. 
        // If it's a complex object, JSON stringify it (likely invalid date, handled by isValid check later)
        str = JSON.stringify(value).replace(/^"|"$/g, ''); // Remove quotes added by JSON.stringify
    } else {
        str = String(value as string | number | boolean);
    }
    
    if (!param) {
        log.debug('date_modify filter requires a parameter');
        return str;
    }

    // Parse the input date
    const date = moment(str);
    if (!date.isValid()) {
        log.debug('Invalid date for date_modify filter:', str);
        return str;
    }

    // Remove outer parentheses if present (e.g., "(+7 days)" → "+7 days")
    let cleanParam = param.replace(/^\((.*)\)$/, '$1');
    
    // Remove any surrounding quotes and trim whitespace
    cleanParam = cleanParam.replace(/^(['"])(.*)\1$/, '$2').trim();

    // Regex to match: +/- followed by number, optional space, and unit (with optional 's')
    // Examples: "+7 days", "-1month", "+3 weeks", "-30 days"
    const regex = /^([+-])\s*(\d+)\s*(\w+)s?$/;
    const match = cleanParam.match(regex);

    if (!match) {
        log.debug('Invalid format for date_modify filter:', param);
        return str;
    }

    const [, operation, amount, unit] = match;
    const numericAmount = parseInt(amount, 10);

    // Apply the operation
    if (operation === '+') {
        date.add(numericAmount, unit as moment.unitOfTime.DurationConstructor);
    } else {
        date.subtract(numericAmount, unit as moment.unitOfTime.DurationConstructor);
    }

    // Return in standard YYYY-MM-DD format
    return date.format('YYYY-MM-DD');
}
