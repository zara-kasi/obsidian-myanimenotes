/**
 * Filter Registry
 * 
 * Central registry for all template filters
 * Filters transform variable values (e.g., formatting, wikilinks, joins)
 */

import type { UniversalMediaItem } from '../../../transformers';

export type FilterFunction = (value: unknown, param?: string, item?: UniversalMediaItem) => unknown;

// Import individual filters
import { wikilink } from './wikilink';
import { join } from './join';
import { date } from './date';
import { split } from './split';
import { defaultFilter } from './default';
import { lower } from './lower';
import { upper } from './upper';

// Filter registry
const filterRegistry: Record<string, FilterFunction> = {
  wikilink,
  join,
  date,
  split,
  default: defaultFilter,
  lower,
  upper,
};

/**
 * Apply a chain of filters to a value
 * 
 * @param value - Input value (string or array)
 * @param filterString - Pipe-separated filter chain (e.g., "wikilink|join:', '")
 * @param item - Media item for context-aware filters
 * @returns Transformed value
 */
 
 export function applyFilters(
  value: unknown,
  filterString: string,
  item?: UniversalMediaItem
): unknown {
  if (!filterString || filterString.trim() === '') {
    return value;
  }

  // Split filter string by pipes
  const filters = filterString.split('|').map(f => f.trim()).filter(Boolean);

  // Apply each filter in sequence
  return filters.reduce((currentValue, filterExpr) => {
    // Parse filter name and parameter
    const colonIndex = filterExpr.indexOf(':');
    let filterName: string;
    let param: string | undefined;

    if (colonIndex !== -1) {
      filterName = filterExpr.substring(0, colonIndex).trim();
      param = filterExpr.substring(colonIndex + 1).trim();
      // Remove surrounding quotes from parameter
      param = param.replace(/^["']|["']$/g, '');
    } else {
      filterName = filterExpr;
    }

    const filter = filterRegistry[filterName];
    
    if (filter) {
      return filter(currentValue, param, item);
    } else {
      console.warn(`Unknown filter: ${filterName}`);
      return currentValue;
    }
  }, value);
}

/**
 * Get list of available filters
 */
export function getAvailableFilters(): string[] {
  return Object.keys(filterRegistry);
}