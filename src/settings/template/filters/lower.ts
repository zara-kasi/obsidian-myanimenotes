/**
 * Lower Filter
 * 
 * Converts text to lowercase
 */

export function lower(value: unknown): string | string[] | null | undefined {
  if (value === undefined || value === null || value === '') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item.toLowerCase();
      return JSON.stringify(item).toLowerCase();
    });
  }

  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  
  return JSON.stringify(value).toLowerCase();
}