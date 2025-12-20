/**
 * Split Filter
 * 
 * Splits a string into an array
 */

export function split(value: unknown, separator = ','): string[] {
  if (value === undefined || value === null || value === '') {
    return [];
  }

  const str = String(value);
  return str
    .split(separator)
    .map(item => item.trim())
    .filter(Boolean);
}