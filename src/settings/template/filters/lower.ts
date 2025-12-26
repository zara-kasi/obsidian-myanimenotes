/**
 * Lower Filter
 * * Converts text to lowercase
 */

/**
 * A template filter that converts the input value to lowercase.
 * * Behavior:
 * - **Strings**: Converted directly (e.g., "Anime" -> "anime").
 * - **Arrays**: Returns a new array where every element is lowercased.
 * - **Objects/Numbers**: Converted to a JSON string first, then lowercased.
 * - **Null/Undefined**: returned as-is.
 * * @param value - The input value to process.
 * @returns The lowercase string, array of lowercase strings, or the original null/undefined value.
 */
export function lower(value: unknown): string | string[] | null | undefined {
  // Pass through empty/null values without modification
  if (value === undefined || value === null || value === '') {
    return value;
  }

  // Handle arrays (e.g., lowercasing a list of genres)
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item.toLowerCase();
      // Safe fallback for non-string items in an array
      return JSON.stringify(item).toLowerCase();
    });
  }

  // Handle standard strings
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  
  // Handle other types (numbers, objects) by stringifying them first
  return JSON.stringify(value).toLowerCase();
}
