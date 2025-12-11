/**
 * Date Filter
 * 
 * Formats dates using Obsidian's built-in moment.js
 */

import { moment } from 'obsidian';

export function date(value: any, format: string = 'YYYY-MM-DD'): string {
  if (!value || value === '') {
    return '';
  }

  const dateStr = String(value);
  const parsed = moment(dateStr);

  if (!parsed.isValid()) {
    console.warn(`Invalid date: ${dateStr}`);
    return dateStr;
  }

  return parsed.format(format);
}