/**
 * Table Filter
 * * Converts JSON data into Markdown tables
 * * Supports objects, arrays of objects, arrays of arrays, and simple arrays
 */

import { logger } from "../../../utils/logger";

const log = new logger("TableFilter");

/**
 * Helper to safely convert values to strings for table cells.
 * Handles objects by JSON stringifying them.
 */
function safeString(val: unknown): string {
    if (val === undefined || val === null) {
        return '';
    }
    if (typeof val === 'object') {
        return JSON.stringify(val);
    }
    // Explicitly cast primitive to avoid linter error [no-base-to-string]
    return String(val as string | number | boolean);
}

/**
 * A template filter that converts JSON data into Markdown table format.
 * * * Behavior:
 * - **Single object**: Creates a two-column table (key | value)
 * - **Array of objects**: Creates a table with object keys as headers
 * - **Array of arrays**: Creates a table from nested arrays
 * - **Simple array**: Creates a single-column table
 * - **Custom headers**: Can specify custom column headers via params
 * * * Parameters:
 * - Custom headers can be provided as comma-separated values
 * - Example: `{{ data | table:"Name,Age,City" }}`
 * * * Usage examples:
 * - `{{ metadata | table }}` → Two-column key-value table
 * - `{{ characters | table }}` → Multi-column table from object array
 * - `{{ scores | table:"Student,Score" }}` → Table with custom headers
 * * @param value - The input value (object, array, or JSON string).
 * @param param - Optional custom headers as comma-separated string.
 * @returns A formatted Markdown table, or original value if conversion fails.
 */
export function table(value: unknown, param?: string): string {
    // Handle null/undefined/empty
    if (value === undefined || value === null || value === '') {
        return '';
    }

    try {
        let data: unknown;

        // Parse JSON string if needed
        if (typeof value === 'string') {
            // Check for special string values
            if (value === 'undefined' || value === 'null') {
                return value;
            }
            try {
                data = JSON.parse(value);
            } catch {
                // If it's not valid JSON, return as-is
                return value;
            }
        } else {
            data = value;
        }

        let customHeaders: string[] = [];

        // Parse custom headers from params if provided
        if (param) {
            try {
                // Remove outer parentheses if present
                const headerStr = param.replace(/^\((.*)\)$/, '$1');
                // Remove quotes and split by comma
                customHeaders = headerStr
                    .split(',')
                    .map(header => 
                        header.trim().replace(/^["'](.*)["']$/, '$1')
                    );
            } catch (error) {
                log.error('Error parsing table headers:', error);
            }
        }

        /**
         * Escapes pipe characters in cell content to prevent table breaking
         */
        const escapeCell = (cell: string): string => 
            cell.replace(/\|/g, '\\|');

        // Handle single object - create key-value table
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
            const entries = Object.entries(data as Record<string, unknown>);
            if (entries.length === 0) {
                return typeof value === 'string' ? value : JSON.stringify(value);
            }

            const [[firstKey, firstValue], ...restEntries] = entries;
            let tableStr = `| ${escapeCell(firstKey)} | ${escapeCell(safeString(firstValue))} |\n| - | - |\n`;
            
            restEntries.forEach(([key, val]) => {
                tableStr += `| ${escapeCell(key)} | ${escapeCell(safeString(val))} |\n`;
            });
            
            return tableStr.trim();
        }

        // Handle array of objects - create multi-column table
        if (
            Array.isArray(data) && 
            data.length > 0 && 
            typeof data[0] === 'object' && 
            data[0] !== null
        ) {
            // Cast to Record[] to avoid implicit any
            const objectList = data as Record<string, unknown>[];
            
            const headers = customHeaders.length > 0 
                ? customHeaders 
                : Object.keys(objectList[0]);
            
            let tableStr = `| ${headers.join(' | ')} |\n| ${headers.map(() => '-').join(' | ')} |\n`;
            
            objectList.forEach(row => {
                tableStr += `| ${headers.map(header => 
                    escapeCell(safeString(row[header]))
                ).join(' | ')} |\n`;
            });

            return tableStr.trim();
        }

        // Handle array of arrays - create table from nested arrays
        if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
            const arrayList = data as unknown[][];
            const maxColumns = Math.max(...arrayList.map(row => row.length));
            const headers = customHeaders.length > 0 
                ? customHeaders 
                : Array(maxColumns).fill('');
            
            let tableStr = `| ${headers.join(' | ')} |\n| ${headers.map(() => '-').join(' | ')} |\n`;

            arrayList.forEach(row => {
                const padding = Array(Math.max(0, maxColumns - row.length)).fill('') as string[];
                const paddedRow = [
                    ...row, 
                    ...padding
                ];
                tableStr += `| ${paddedRow.map(cell => 
                    escapeCell(safeString(cell))
                ).join(' | ')} |\n`;
            });

            return tableStr.trim();
        }

        // Handle simple array
        if (Array.isArray(data)) {
            const simpleList = data as unknown[];
            // If custom headers provided, break array into rows
            if (customHeaders.length > 0) {
                const numColumns = customHeaders.length;
                let tableStr = `| ${customHeaders.join(' | ')} |\n| ${customHeaders.map(() => '-').join(' | ')} |\n`;
                
                // Break the array into rows based on the number of columns
                for (let i = 0; i < simpleList.length; i += numColumns) {
                    const row = simpleList.slice(i, i + numColumns);
                    // Pad the row with empty strings if needed
                    const padding = Array(Math.max(0, numColumns - row.length)).fill('') as string[];
                    const paddedRow = [
                        ...row, 
                        ...padding
                    ];
                    tableStr += `| ${paddedRow.map(cell => 
                        escapeCell(safeString(cell))
                    ).join(' | ')} |\n`;
                }
                return tableStr.trim();
            }

            // Default single column table if no headers provided
            let tableStr = "| Value |\n| - |\n";
            simpleList.forEach(item => {
                tableStr += `| ${escapeCell(safeString(item))} |\n`;
            });

            return tableStr.trim();
        }

        // If none of the above cases match, return the original value
        return typeof value === 'string' ? value : JSON.stringify(value);
        
    } catch (error) {
        log.error('Error in table filter:', error);
        return typeof value === 'string' ? value : JSON.stringify(value);
    }
}
