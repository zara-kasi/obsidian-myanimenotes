/**
 * Nth Filter
 * * Selects elements at specific positions in an array
 * * Supports CSS-style nth expressions and custom patterns
 */

import { logger } from '../../../utils/logger';

const log = new logger('NthFilter');

/**
 * A template filter that selects elements at specific positions in an array.
 * * * Behavior:
 * - **Single position**: `{{ items | nth:"3" }}` → Gets 3rd item
 * - **Every nth**: `{{ items | nth:"2n" }}` → Gets every 2nd item (2, 4, 6...)
 * - **From position**: `{{ items | nth:"n+5" }}` → Gets items from 5th onward
 * - **Pattern with basis**: `{{ items | nth:"1,3:5" }}` → Gets 1st and 3rd item of every 5
 * * * Parameters:
 * - Simple number: "3" → 3rd element only
 * - Every nth: "5n" → Every 5th element (5, 10, 15...)
 * - From position: "n+7" → All elements from 7th onward
 * - Pattern: "1,2,3:7" → 1st, 2nd, 3rd of every 7 elements
 * * * Usage examples:
 * - `{{ episodes | nth:"1" }}` → First episode only
 * - `{{ episodes | nth:"5n" }}` → Every 5th episode
 * - `{{ episodes | nth:"n+10" }}` → Episodes from 10 onward
 * - `{{ episodes | nth:"1,5:10" }}` → 1st and 5th of every 10 episodes
 * * @param value - The input value (array or JSON string).
 * @param param - Nth expression pattern.
 * @returns JSON stringified filtered array.
 */
export function nth(value: unknown, param?: string): string {
    // Handle empty or invalid input
    if (value === undefined || value === null || value === '') {
        return typeof value === 'string' ? value : '';
    }

    let data: unknown[];

    try {
        // Parse input into array
        if (Array.isArray(value)) {
            data = value;
        } else if (typeof value === 'string') {
            // Fix: Explicitly type as unknown to avoid "Unsafe assignment of any value"
            const parsed: unknown = JSON.parse(value);
            if (!Array.isArray(parsed)) {
                return value;
            }
            // Fix: Cast to unknown[] to match 'data' type
            data = parsed as unknown[];
        } else {
            // Not an array or parseable string
            return typeof value === 'string' ? value : JSON.stringify(value);
        }
    } catch (error) {
        log.error('Error in nth filter:', error);
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    // Default to keeping every item if no params
    if (!param) {
        return JSON.stringify(data);
    }

    // Remove outer parentheses and quotes if present
    const cleanParam = param
        .replace(/^\((.*)\)$/, '$1')
        .replace(/^(['"])(.*)\1$/, '$2')
        .trim();

    try {
        // Check if we have a basis pattern (e.g., "1,2,3:7")
        if (cleanParam.includes(':')) {
            const [positions, basis] = cleanParam.split(':').map(p => p.trim());
            const nthValues = positions
                .split(',')
                .map(n => parseInt(n.trim(), 10))
                .filter(n => !isNaN(n) && n > 0);
            const basisSize = parseInt(basis, 10);

            if (isNaN(basisSize) || basisSize <= 0) {
                log.error('Invalid basis size in nth filter:', basis);
                return JSON.stringify(data);
            }

            return JSON.stringify(
                data.filter((_, index) => {
                    const positionInGroup = (index % basisSize) + 1;
                    return nthValues.includes(positionInGroup);
                })
            );
        }

        // Parse CSS-style nth expressions
        const nthExpression = cleanParam;

        // Handle simple number (e.g., "7")
        if (/^\d+$/.test(nthExpression)) {
            const position = parseInt(nthExpression, 10);
            return JSON.stringify(
                data.filter((_, index) => index + 1 === position)
            );
        }

        // Handle "n" multiplier (e.g., "5n")
        if (/^\d+n$/.test(nthExpression)) {
            const multiplier = parseInt(nthExpression, 10);
            return JSON.stringify(
                data.filter((_, index) => {
                    const position = index + 1;
                    return position % multiplier === 0;
                })
            );
        }

        // Handle "n+b" format (e.g., "n+7")
        const nPlusBMatch = nthExpression.match(/^n\+(\d+)$/);
        if (nPlusBMatch) {
            const offset = parseInt(nPlusBMatch[1], 10);
            return JSON.stringify(
                data.filter((_, index) => {
                    const position = index + 1;
                    return position >= offset;
                })
            );
        }

        // Invalid syntax
        log.error('Invalid nth filter syntax:', param);
        return JSON.stringify(data);

    } catch (error) {
        log.error('Error processing nth filter:', error);
        return JSON.stringify(data);
    }
}
