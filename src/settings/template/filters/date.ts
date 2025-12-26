/**
 * Date Filter
 * * Formats dates using Obsidian's built-in moment.js
 */

import { moment } from 'obsidian';

/**
 * Formats a date value into a specified string format using Moment.js.
 * This is used as a template filter (e.g., `{{ variable | date:"YYYY-MM-DD" }}`).
 *
 * @param value - The date to format. Can be a date string, ISO string, or object.
 * @param format - The target format pattern (default: 'YYYY-MM-DD').
 * See Moment.js docs for valid patterns.
 * @returns The formatted date string, or the original value if parsing fails.
 */
export function date(value: unknown, format = 'YYYY-MM-DD'): string {
  // Return empty string for null/undefined/empty input
  if (!value || value === '') {
    return '';
  }

  // Ensure input is a string for Moment parsing
  const dateStr = typeof value === 'string' ? value : JSON.stringify(value);

  // Use Obsidian's global moment instance
  const parsed = moment(dateStr);

  // Fallback if the date string is not recognized
  if (!parsed.isValid()) {
    console.warn(`Invalid date: ${dateStr}`);
    return dateStr;
  }

  return parsed.format(format);
}
