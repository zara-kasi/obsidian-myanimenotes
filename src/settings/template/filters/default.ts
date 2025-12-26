/**
 * Default Filter
 * * Provides a fallback value if the input is empty/undefined
 */

/**
 * A template filter that returns a fallback value if the input is considered "empty".
 *
 * This is widely used in templates to ensure user-friendly output when data is missing.
 * Example: `{{ score | default:"N/A" }}`
 *
 * @param value - The input value to check (string, number, array, or null/undefined).
 * @param fallback - The value to return if the input is empty (defaults to empty string).
 * @returns The original value if it contains data, otherwise the fallback value.
 */
export function defaultFilter(value: unknown, fallback = ''): unknown {
  // Check for standard "falsy" primitives relevant to templates
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  // Check specifically for empty arrays (e.g., an anime with no genres listed)
  if (Array.isArray(value) && value.length === 0) {
    return fallback;
  }

  return value;
}
