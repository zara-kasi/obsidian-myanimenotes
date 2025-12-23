/**
 * Upper Filter
 * 
 * Converts text to uppercase
 */

export function upper(value: unknown): string | string[] | null | undefined {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item.toUpperCase();
      return JSON.stringify(item).toUpperCase();
    });
  }

  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  
  return JSON.stringify(value).toUpperCase();
}