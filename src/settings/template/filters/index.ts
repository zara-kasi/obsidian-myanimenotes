/**
 * Filter Registry
 * * Central registry for all template filters
 * Filters transform variable values (e.g., formatting, wikilinks, joins)
 */

import type { MediaItem } from "../../../models";
import { logger } from "../../../utils/logger";

// Import filters
import { wikilink } from "./wikilink";
import { join } from "./join";
import { date } from "./date";
import { split } from "./split";
import { defaultFilter } from "./default";
import { lower } from "./lower";
import { upper } from "./upper";
import { blockquote } from "./blockquote";
import { calc } from "./calc";
import { callout } from "./callout";
import { camel } from "./camel";
import { capitalize } from "./capitalize";
import { date_modify } from "./date_modify";
import { duration } from "./duration";
import { first } from "./first";
import { footnote } from "./footnote";
import { kebab } from "./kebab";
import { last } from "./last";
import { length } from "./length";
import { list } from "./list";
import { map } from "./map";
import { merge } from "./merge";
import { nth } from "./nth";
import { number_format } from "./number_format";
import { object } from "./object";
import { pascal } from "./pascal";
import { replace } from "./replace";
import { reverse } from "./reverse";
import { round } from "./round";
import { safe_name } from "./safe_name";
import { slice } from "./slice";
import { snake } from "./snake";
import { unsnake } from "./unsnake";
import { table } from "./table";
import { template } from "./template";
import { title } from "./title";
import { trim } from "./trim";
import { uncamel } from "./uncamel";
import { unique } from "./unique";

const log = new logger("FilterRegistry");

export type FilterFunction = (
    value: unknown,
    param?: string,
    item?: MediaItem
) => unknown;

// Filter registry
const filterRegistry: Record<string, FilterFunction> = {
    wikilink,
    join,
    date,
    split,
    default: defaultFilter,
    lower,
    upper,
    blockquote,
    calc,
    callout,
    camel,
    capitalize,
    date_modify,
    duration,
    first,
    footnote,
    kebab,
    last,
    length,
    list,
    map,
    merge,
    nth,
    number_format,
    object,
    pascal,
    replace,
    reverse,
    round,
    safe_name,
    slice,
    snake,
    unsnake,
    table,
    template,
    title,
    trim,
    uncamel,
    unique
};

/**
 * Apply a chain of filters to a value
 * * @param value - Input value (string or array)
 * @param filterString - Pipe-separated filter chain (e.g., "wikilink|join:', '")
 * @param item - Media item for context-aware filters
 * @returns Transformed value
 */
export function applyFilters(
    value: unknown,
    filterString: string,
    item?: MediaItem
): unknown {
    if (!filterString || filterString.trim() === "") {
        return value;
    }

    // Split filter string by pipes
    const filters = filterString
        .split("|")
        .map(f => f.trim())
        .filter(Boolean);

    // Apply each filter in sequence
    return filters.reduce((currentValue, filterExpr) => {
        // Parse filter name and parameter
        const colonIndex = filterExpr.indexOf(":");
        let filterName: string;
        let param: string | undefined;

        if (colonIndex !== -1) {
            filterName = filterExpr.substring(0, colonIndex).trim();
            param = filterExpr.substring(colonIndex + 1).trim();
            // Remove surrounding quotes from parameter
            param = param.replace(/^["']|["']$/g, "");
        } else {
            filterName = filterExpr;
        }

        const filter = filterRegistry[filterName];

        if (filter) {
            return filter(currentValue, param, item);
        } else {
            log.debug(`Unknown filter: ${filterName}`);
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
