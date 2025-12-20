/**
 * Property Formatter - Simple type formatting system
 *
 * Purpose: Format property values to match Obsidian's expected formats
 * so users don't get warnings when Obsidian tries to interpret the type.
 *
 * Example: If "rating" is set as Number type, we format "8" → 8
 * This prevents Obsidian's "This property is formatted as text" warning.
 */

import { App, FuzzySuggestModal } from "obsidian";

/**
 * Obsidian's supported property types
 */
export type PropertyType =
    | "text"
    | "number"
    | "date"
    | "datetime"
    | "checkbox"
    | "multitext";

/**
 * Property type display information
 */
interface PropertyTypeInfo {
    type: PropertyType;
    label: string;
    icon: string;
    description: string;
}

/**
 * Available property types
 */
const PROPERTY_TYPES: PropertyTypeInfo[] = [
    { type: "text", label: "Text", icon: "text", description: "Plain text" },
    {
        type: "number",
        label: "Number",
        icon: "binary",
        description: "Numeric value (e.g., 8, 24, 9.5)"
    },
    {
        type: "date",
        label: "Date",
        icon: "calendar",
        description: "Date only (YYYY-MM-DD)"
    },
    {
        type: "datetime",
        label: "Date & Time",
        icon: "clock",
        description: "Date with time"
    },
    {
        type: "checkbox",
        label: "Checkbox",
        icon: "check-square",
        description: "Boolean (true/false)"
    },
    {
        type: "multitext",
        label: "List",
        icon: "list",
        description: "Array of values"
    }
];

/**
 * Modal for selecting property type
 */
class PropertyTypeSelectorModal extends FuzzySuggestModal<PropertyTypeInfo> {
    private resolvePromise: ((type: PropertyType | null) => void) | null = null;
    private propertyKey: string;

    constructor(app: App, propertyKey: string) {
        super(app);
        this.propertyKey = propertyKey;
        this.setPlaceholder(`Select format type for: ${propertyKey}`);
    }

    getItems(): PropertyTypeInfo[] {
        return PROPERTY_TYPES;
    }

    getItemText(item: PropertyTypeInfo): string {
        return `${item.label} - ${item.description}`;
    }

    onChooseItem(item: PropertyTypeInfo): void {
        if (this.resolvePromise) {
            this.resolvePromise(item.type);
            this.resolvePromise = null;
        }
    }

    onClose(): void {
        super.onClose();
        // If modal closed without selection, resolve with null
        if (this.resolvePromise) {
            this.resolvePromise(null);
            this.resolvePromise = null;
        }
    }

    async promptForType(): Promise<PropertyType | null> {
        return new Promise(resolve => {
            this.resolvePromise = resolve;
            this.open();
        });
    }
}

/**
 * Opens modal to select property type
 */
export async function promptForPropertyType(
    app: App,
    propertyKey: string
): Promise<PropertyType | null> {
    const modal = new PropertyTypeSelectorModal(app, propertyKey);
    return await modal.promptForType();
}

/**
 * Gets icon name for a property type
 */
export function getPropertyTypeIcon(type: PropertyType | undefined): string {
    if (!type) return "text";
    const typeInfo = PROPERTY_TYPES.find(t => t.type === type);
    return typeInfo?.icon || "text";
}

/**
 * Formats a value according to its property type
 * This is the core function that prevents Obsidian warnings
 *
 * @param value - The value to format (from template resolution)
 * @param type - The target property type
 * @returns Properly formatted value
 */
export function formatPropertyValue(
    value: unknown,
    type: PropertyType | undefined
): unknown {
    // If no type specified, return as-is (default text behavior)
    if (!type || type === "text") {
        return value;
    }

    // Handle null/undefined
    if (value === null || value === undefined || value === "") {
        switch (type) {
            case "checkbox":
                return false;
            case "number":
                return null;
            case "multitext":
                return [];
            default:
                return null;
        }
    }

    switch (type) {
        case "number":
            // Format as number
            if (typeof value === "number") return value;
            if (typeof value === "string") {
                const num = parseFloat(value);
                return isNaN(num) ? null : num;
            }
            return null;

        case "checkbox":
            // Format as boolean
            if (typeof value === "boolean") return value;
            if (typeof value === "string") {
                return value.toLowerCase() === "true" || value === "1";
            }
            if (typeof value === "number") return value !== 0;
            return false;

        case "multitext":
            // Format as array
            if (Array.isArray(value)) return value;
            if (typeof value === "string") return [value];
            return [];

        case "date":
            // Format as YYYY-MM-DD
            if (typeof value === "string") {
                // Extract date part if datetime string
                if (value.includes("T")) {
                    return value.split("T")[0];
                }
                return value;
            }
            return value;

        case "datetime":
            // Format as ISO 8601 datetime
            if (typeof value === "string") return value;
            return value;

        default:
            return value;
    }
}
