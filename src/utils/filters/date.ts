/**
 * Date Filter
 * 
 * Formats dates using dayjs
 */

import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

export function date(value: any, format: string = 'YYYY-MM-DD'): string {
  if (!value || value === '') {
    return '';
  }

  const dateStr = String(value);
  const parsed = dayjs(dateStr);

  if (!parsed.isValid()) {
    console.warn(`Invalid date: ${dateStr}`);
    return dateStr;
  }

  return parsed.format(format);
}