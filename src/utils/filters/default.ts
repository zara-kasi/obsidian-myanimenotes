/**
 * Default Filter
 * 
 * Provides a fallback value if the input is empty/undefined
 */

export function defaultFilter(value: any, fallback: string = ''): any {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  // Check if array is empty
  if (Array.isArray(value) && value.length === 0) {
    return fallback;
  }

  return value;
}