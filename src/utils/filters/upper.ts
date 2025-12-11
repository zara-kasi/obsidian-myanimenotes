/**
 * Upper Filter
 * 
 * Converts text to uppercase
 */

export function upper(value: any): any {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => String(item).toUpperCase());
  }

  return String(value).toUpperCase();
}