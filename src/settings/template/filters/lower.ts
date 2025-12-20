/**
 * Lower Filter
 * 
 * Converts text to lowercase
 */

export function lower(value: unknown): string | string[] | null | undefined | '' {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => String(item).toLowerCase());
  }

  return String(value).toLowerCase();
}