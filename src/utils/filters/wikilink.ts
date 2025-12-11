/**
 * Wikilink Filter
 * 
 * Converts values into Obsidian wikilinks [[value]]
 */

export function wikilink(value: any): any {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => {
      const str = String(item).trim();
      return str ? `[[${str}]]` : str;
    });
  }

  // Handle single values
  const str = String(value).trim();
  return str ? `[[${str}]]` : str;
}