/**
 * Wikilink Filter
 *
 * Converts values into Obsidian wikilinks [[value]]
 */

export function wikilink(value: unknown): string | string[] | null | undefined {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => {
      const str = (typeof item === 'string' ? item : JSON.stringify(item)).trim();
      return str ? `[[${str}]]` : str;
    });
  }

  // Handle single values
  const str = (typeof value === 'string' ? value : JSON.stringify(value)).trim();
  return str ? `[[${str}]]` : str;
}