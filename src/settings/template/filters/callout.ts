/**
 * Callout Filter
 * * Converts text into Obsidian callout blocks
 * * Supports different callout types, custom titles, and fold states
 */

/**
 * A template filter that wraps text in Obsidian's callout syntax.
 * * * Behavior:
 * - **Basic callout**: `{{ synopsis | callout }}` → Creates an info callout
 * - **With type**: `{{ synopsis | callout:"warning" }}` → Creates a warning callout
 * - **With title**: `{{ synopsis | callout:"note,Summary" }}` → Adds custom title
 * - **With fold state**: `{{ synopsis | callout:"tip,Pro Tip,true" }}` → Collapsible (folded by default)
 * * * Parameters (comma-separated):
 * 1. **Type**: info, note, tip, warning, error, question, success, etc.
 * 2. **Title**: Custom title text (optional)
 * 3. **Fold state**: "true" for collapsed (-), "false" for expanded (+), omit for no fold
 * * * Usage examples:
 * - `{{ synopsis | callout:"note" }}`
 * - `{{ synopsis | callout:"warning,Spoiler Alert" }}`
 * - `{{ synopsis | callout:"info,Plot Summary,true" }}`
 * * @param value - The input value to wrap in a callout.
 * @param param - Optional parameters: "type,title,foldState".
 * @returns A formatted Obsidian callout block.
 */
export function callout(value: unknown, param?: string): string {
    // Return empty string if input is null, undefined, or empty
    if (value === undefined || value === null || value === '') {
        return '';
    }

    let str: string;

    // Handle objects by stringifying them so they are readable
    if (typeof value === 'object') {
        str = JSON.stringify(value, null, 2);
    } else {
        // Safe cast for primitives to satisfy 'no-base-to-string' rule
        str = String(value as string | number | boolean);
    }

    // Default values
    let type = 'info';
    let title = '';
    let foldState: string | null = null;

    if (param) {
        // Remove outer parentheses if present (e.g., "(note,Title)" → "note,Title")
        const cleanParam = param.replace(/^\((.*)\)$/, '$1');

        // Split by comma, but respect both single and double quoted strings
        // This regex ensures commas inside quotes are not treated as separators
        const params = cleanParam
            .split(/,(?=(?:(?:[^"']*["'][^"']*["'])*[^"']*$))/)
            .map(p => {
                // Trim whitespace and remove surrounding quotes (both single and double)
                return p.trim().replace(/^(['"])(.*)\1$/, '$2');
            });

        // Parse parameters
        if (params.length > 0 && params[0]) type = params[0];
        if (params.length > 1 && params[1]) title = params[1];
        if (params.length > 2) {
            const foldParam = params[2].toLowerCase();
            if (foldParam === 'true') foldState = '-';  // Collapsed by default
            else if (foldParam === 'false') foldState = '+'; // Expanded by default
        }
    }

    // Build the callout header
    let calloutHeader = `> [!${type}]`;
    if (foldState) calloutHeader += foldState;
    if (title) calloutHeader += ` ${title}`;

    // Convert each line of content to callout format
    const calloutContent = str
        .split('\n')
        .map(line => `> ${line}`)
        .join('\n');

    return `${calloutHeader}\n${calloutContent}`;
}
