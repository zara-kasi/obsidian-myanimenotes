/**
 * Join Filter
 * * Joins array elements with a separator
 */

/**
 * A template filter that combines an array of items into a single string using a separator.
 * * Usage in templates: `{{ genres | join:", " }}`
 * * @param value - The input value. Usually an array (e.g., list of genres or studios), 
 * but handles single values gracefully.
 * @param separator - The delimiter to place between items (default: ", ").
 * @returns A single concatenated string.
 */
export function join(value: unknown, separator = ', '): string {
  // Return empty string for null/undefined inputs
  if (value === undefined || value === null) {
    return '';
  }

  // If the input is not an array, simply return it as a string.
  // This prevents errors if a user tries to |join a single text field.
  if (!Array.isArray(value)) {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  // standard processing:
  // 1. Filter out null/undefined/empty strings to avoid gaps like "Action, , Adventure"
  // 2. Convert all remaining items to strings
  // 3. Join with the specified separator
  return value
    .filter(item => item !== undefined && item !== null && item !== '')
    .map(item => String(item))
    .join(separator);
}
