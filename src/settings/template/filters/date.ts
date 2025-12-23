/**
 * Date Filter
 * 
 * Formats dates using Obsidian's built-in moment.js
 */

import { moment } from 'obsidian';

export function date(value: unknown, format = 'YYYY-MM-DD'): string {
  if (!value || value === '') {
    return '';
  }

  const dateStr = typeof value === 'string' ? value : JSON.stringify(value);

  const parsed = moment(dateStr);

  if (!parsed.isValid()) {
    console.warn(`Invalid date: ${dateStr}`);
    return dateStr;
  }

  return parsed.format(format);
}