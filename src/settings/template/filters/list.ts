/**
 * List Filter
 * * Converts arrays into Markdown list formats
 * * Supports bullet lists, numbered lists, and task lists
 */

import { logger } from "../../../utils/logger";

const log = new logger("ListFilter");

type ListType = "bullet" | "numbered" | "task" | "numbered-task";

/**
 * A template filter that converts arrays into formatted Markdown lists.
 * * * Behavior:
 * - **Bullet list**: `{{ genres | list }}` → `- Action\n- Fantasy`
 * - **Numbered list**: `{{ genres | list:"numbered" }}` → `1. Action\n2. Fantasy`
 * - **Task list**: `{{ todos | list:"task" }}` → `- [ ] Item 1\n- [ ] Item 2`
 * - **Numbered task**: `{{ todos | list:"numbered-task" }}` → `1. [ ] Item 1\n2. [ ] Item 2`
 * - **Nested arrays**: Automatically indented with tabs
 * * * Parameters:
 * - "bullet" (default) - Unordered list with `-`
 * - "numbered" - Ordered list with `1.`, `2.`, etc.
 * - "task" - Task list with `- [ ]`
 * - "numbered-task" - Numbered task list with `1. [ ]`
 * * * Usage examples:
 * - `{{ genres | list }}` → Basic bullet list
 * - `{{ episodes | list:"numbered" }}` → Numbered list
 * - `{{ watchlist | list:"task" }}` → Task checklist
 * * @param value - The input value (array or string).
 * @param param - Optional list type.
 * @returns Formatted Markdown list as string.
 */
export function list(value: unknown, param?: string): string {
    /**
     * Determines the list type from parameter.
     */
    const determineListType = (p?: string): ListType => {
        if (!p) return "bullet";

        // Remove outer parentheses and quotes if present
        const cleanParam = p
            .replace(/^\((.*)\)$/, "$1")
            .replace(/^(['"])(.*)\1$/, "$2")
            .toLowerCase();

        switch (cleanParam) {
            case "numbered":
                return "numbered";
            case "task":
                return "task";
            case "numbered-task":
                return "numbered-task";
            default:
                return "bullet";
        }
    };

    /**
     * Processes a single list item.
     */
    const processListItem = (
        item: unknown,
        type: ListType,
        depth: number = 0
    ): string => {
        const indent = "\t".repeat(depth);
        let prefix: string;

        switch (type) {
            case "numbered":
                prefix = "1. ";
                break;
            case "task":
                prefix = "- [ ] ";
                break;
            case "numbered-task":
                prefix = "1. [ ] ";
                break;
            default:
                prefix = "- ";
        }

        // Handle nested arrays
        if (Array.isArray(item)) {
            // Fix: Cast item to unknown[] for strict type compliance
            return processArray(item as unknown[], type, depth + 1);
        }

        // Convert item to string
        const itemStr =
            typeof item === "object" && item !== null
                ? JSON.stringify(item)
                : String(item as string | number | boolean);

        return `${indent}${prefix}${itemStr}`;
    };

    /**
     * Processes an array of items.
     */
    const processArray = (
        arr: unknown[],
        type: ListType,
        depth: number = 0
    ): string => {
        return arr
            .map((item, index) => {
                const itemType = type;

                // For numbered lists, replace the number placeholder with actual index
                if (type === "numbered" || type === "numbered-task") {
                    const number = index + 1;
                    return processListItem(item, itemType, depth).replace(
                        /^\t*\d+/,
                        match => {
                            const tabs = match.match(/^\t*/)?.[0] || "";
                            return `${tabs}${number}`;
                        }
                    );
                }

                return processListItem(item, itemType, depth);
            })
            .join("\n");
    };

    // Handle null/undefined/empty
    if (value === undefined || value === null || value === "") {
        return "";
    }

    const listType = determineListType(param);

    try {
        // Handle arrays directly
        if (Array.isArray(value)) {
            // Fix: Cast value to unknown[] for strict type compliance
            return processArray(value as unknown[], listType);
        }

        // Handle strings (might be JSON)
        if (typeof value === "string") {
            try {
                // Fix: Explicitly type as unknown to avoid "Unsafe assignment of any value"
                const parsed: unknown = JSON.parse(value);

                if (Array.isArray(parsed)) {
                    // Fix: Cast parsed to unknown[] for strict type compliance
                    return processArray(parsed as unknown[], listType);
                }
                // If it's an object or single value, wrap it in an array
                return processArray([parsed], listType);
            } catch {
                // Fix: Removed unused (error) variable
                // If parsing fails, treat it as a single string
                log.debug("Value is not valid JSON, treating as single item");
                return processListItem(value, listType);
            }
        }

        // Handle objects and other types by wrapping in array
        return processArray([value], listType);
    } catch (error) {
        log.error("Error processing list filter:", error);
        // Fallback to treating input as a single item
        return processListItem(value, listType);
    }
}
