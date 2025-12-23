/**
 * Join Filter
 * 
 * Joins array elements with a separator
 */

export function join(value: unknown, separator = ', '): string {
  if (value === undefined || value === null) {
    return '';
  }

  // If not an array, return as string
  if (!Array.isArray(value)) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

  // Filter out empty values and join
  return value
    .filter(item => item !== undefined && item !== null && item !== '')
    .map(item => String(item))
    .join(separator);
}