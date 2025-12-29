/**
 * Map Filter
 * * Transforms array elements using arrow function syntax
 * * Allows property access and object/string transformations
 */

import { logger } from '../../../utils/logger';

const log = new logger('MapFilter');

/**
 * A template filter that transforms array elements using arrow function expressions.
 * * * Behavior:
 * - **Property access**: `{{ authors | map:"x => x.name" }}` → Extract names
 * - **Object literal**: `{{ items | map:"x => {title: x.name, id: x.id}" }}` → Transform to objects
 * - **String template**: `{{ names | map:"x => '${x}'" }}` → Wrap in quotes
 * - **Simple arrays**: `{{ genres | map:"x => x" }}` → Pass through
 * * * Parameter:
 * - Arrow function expression (e.g., "x => x.property", "item => {key: item.value}")
 * * * Usage examples:
 * - `{{ studios | map:"s => s.name" }}` → Extract studio names
 * - `{{ genres | map:"g => {name: g.name, slug: g.slug}" }}` → Create objects
 * - `{{ characters | map:"c => c.name" | join:", " }}` → Extract and join names
 * * @param value - The input value (array or string).
 * @param param - Arrow function expression.
 * @returns JSON stringified transformed array.
 */
export function map(value: unknown, param?: string): string {
    log.debug('map input:', value);
    log.debug('map param:', param);

    // Handle null/undefined/empty
    if (value === undefined || value === null || value === '') {
        return '';
    }

    let array: unknown[];

    // Parse input into array
    try {
        if (Array.isArray(value)) {
            array = value;
        } else if (typeof value === 'string') {
            const parsed: unknown = JSON.parse(value);
            if (Array.isArray(parsed)) {
                array = parsed as unknown[];
            } else {
                array = [parsed];
            }
        } else if (typeof value === 'object') {
            array = Object.values(value as Record<string, unknown>);
        } else {
            array = [value];
        }

        log.debug('Parsed array:', JSON.stringify(array, null, 2));
    } catch {
        log.debug('Parsing failed, using input as single item');
        array = [value];
    }

    // Validate param exists
    if (!param || !Array.isArray(array)) {
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    // Remove outer parentheses and quotes if present
    const cleanParam = param
        .replace(/^\((.*)\)$/, '$1')
        .replace(/^(['"])(.*)\1$/, '$2');

    // Parse arrow function syntax: "argName => expression"
    const match = cleanParam.match(/^\s*(\w+)\s*=>\s*(.+)$/);
    if (!match) {
        log.debug('Invalid arrow function syntax');
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    // Fix: Explicitly type these as strings to prevent 'any' leakage downstream
    const argName: string = match[1];
    const expression: string = match[2];

    log.debug('Arrow function parsed:', { argName, expression });

    // Map over array
    const mappedArray = array.map((item, index) => {
        log.debug(`Processing item ${index}:`, JSON.stringify(item, null, 2));

        const trimmedExpr = expression.trim();

        // Check if expression is an object literal
        if (trimmedExpr.startsWith('{') && trimmedExpr.endsWith('}')) {
            const mappedItem: Record<string, unknown> = {};

            const assignments = trimmedExpr.match(/\{(.+)\}/)?.[1].split(',') || [];

            assignments.forEach((assignment) => {
                const [key, valueExpr] = assignment.split(':').map(s => s.trim());
                const cleanKey = key.replace(/^['"](.+)['"]$/, '$1');
                log.debug('Processing assignment:', { cleanKey, valueExpr });

                const cleanValue = evaluateExpression(valueExpr, item, argName);
                log.debug('Cleaned value:', cleanValue);

                mappedItem[cleanKey] = cleanValue;
                log.debug(`Assigned ${cleanKey}:`, mappedItem[cleanKey]);
            });

            log.debug('Mapped item:', mappedItem);
            return mappedItem;
        }

        // Check if expression is a string literal
        if ((trimmedExpr.startsWith('"') && trimmedExpr.endsWith('"')) ||
            (trimmedExpr.startsWith("'") && trimmedExpr.endsWith("'"))) {
            const stringLiteral = trimmedExpr.slice(1, -1);
            return stringLiteral.replace(
                new RegExp(`\\$\\{${argName}\\}`, 'g'),
                String(item)
            );
        }

        // Otherwise, treat as a simple expression
        return evaluateExpression(expression, item, argName);
    });

    log.debug('Mapped array:', JSON.stringify(mappedArray, null, 2));
    return JSON.stringify(mappedArray);
}

/**
 * Evaluates an expression by replacing property references with actual values.
 */
function evaluateExpression(expression: string, item: unknown, argName: string): unknown {
    if (typeof item === 'string' && expression.trim() === argName) {
        return item;
    }

    // Replace property access patterns like "argName.property" or "argName.nested.property"
    // Fix: Define pattern as string variable first to satisfy linter
    const pattern = `${argName}\\.([\\w.\\[\\]]+)`;
    
    const result = expression.replace(
        new RegExp(pattern, 'g'),
        (_, prop: string) => {
            const value = getNestedProperty(item, prop);
            log.debug(`Replacing ${argName}.${prop} with:`, value);
            return JSON.stringify(value) ?? "null";
        }
    );

    try {
        return JSON.parse(result);
    } catch {
        return result.replace(/^["'](.+)["']$/, '$1');
    }
}

/**
 * Gets a nested property from an object using dot notation or array bracket notation.
 */
function getNestedProperty(obj: unknown, path: string): unknown {
    log.debug('Getting nested property:', { obj: JSON.stringify(obj), path });

    const result = path
        .split(/[.[\]]/)
        .filter(Boolean)
        .reduce((current: unknown, key: string) => {
            if (current && Array.isArray(current) && /^\d+$/.test(key)) {
                return current[parseInt(key, 10)];
            }
            if (current && typeof current === 'object' && current !== null) {
                return (current as Record<string, unknown>)[key];
            }
            return undefined;
        }, obj);

    log.debug('Nested property result:', result);
    return result;
}
