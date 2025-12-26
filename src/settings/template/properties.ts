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
 * Obsidian's supported property types.
 * These correspond to the property types available in the Obsidian Properties UI.
 */
export type PropertyType =
    | "text"
    | "number"
    | "date"
    | "datetime"
    | "checkbox"
    | "multitext";

/**
 * Internal interface for defining metadata about a property type.
 * Used to populate the selection modal.
 */
interface PropertyTypeInfo {
    type: PropertyType;
    label: string;
    icon: string;
    description: string;
}

/**
 * Registry of available property types and their UI representation.
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
 * Modal for selecting a property type.
 * Extends Obsidian's FuzzySuggestModal to allow quick searching and selection.
 */
class PropertyTypeSelectorModal extends FuzzySuggestModal<PropertyTypeInfo> {
    // Promise resolver to return the selected type back to the caller
    private resolvePromise: ((type: PropertyType | null) => void) | null = null;
    private propertyKey: string;

    /**
     * @param app - The Obsidian App instance.
     * @param propertyKey - The name of the property being modified (for display).
     */
    constructor(app: App, propertyKey: string) {
        super(app);
        this.propertyKey = propertyKey;
        this.setPlaceholder(`Select format type for: ${propertyKey}`);
    }

    /**
     * Returns the list of items to suggest.
     */
    getItems(): PropertyTypeInfo[] {
        return PROPERTY_TYPES;
    }

    /**
     * Renders the text for each suggestion item.
     */
    getItemText(item: PropertyTypeInfo): string {
        return `${item.label} - ${item.description}`;
    }

    /**
     * Called when the user selects an item.
     */
    onChooseItem(item: PropertyTypeInfo): void {
        if (this.resolvePromise) {
            this.resolvePromise(item.type);
            this.resolvePromise = null;
        }
    }

    /**
     * Called when the modal is closed (via Escape or clicking outside).
     */
    onClose(): void {
        super.onClose();
        // If modal closed without selection (resolvePromise is still active), resolve with null
        if (this.resolvePromise) {
            this.resolvePromise(null);
            this.resolvePromise = null;
        }
    }

    /**
     * Opens the modal and waits for a user selection.
     * @returns A promise resolving to the selected PropertyType or null if cancelled.
     */
    async promptForType(): Promise<PropertyType | null> {
        return new Promise(resolve => {
            this.resolvePromise = resolve;
            this.open();
        });
    }
}

/**
 * Utility function to open the PropertyTypeSelectorModal.
 *
 * @param app - The Obsidian App instance.
 * @param propertyKey - The name of the property to configure.
 * @returns The selected property type or null.
 */
export async function promptForPropertyType(
    app: App,
    propertyKey: string
): Promise<PropertyType | null> {
    const modal = new PropertyTypeSelectorModal(app, propertyKey);
    return await modal.promptForType();
}

/**
 * Gets the Lucide icon name associated with a specific property type.
 *
 * @param type - The property type.
 * @returns The icon string (e.g., "calendar", "binary"). Defaults to "text".
 */
export function getPropertyTypeIcon(type: PropertyType | undefined): string {
    if (!type) return "text";
    const typeInfo = PROPERTY_TYPES.find(t => t.type === type);
    return typeInfo?.icon || "text";
}

/**
 * Formats a raw value into the specific JavaScript type required by Obsidian's frontmatter parser.
 * This is crucial for preventing "Invalid property type" warnings in the UI.
 *
 * @param value - The value to format (often a string from template replacement).
 * @param type - The target property type definition.
 * @returns A properly typed value (string, number, boolean, array, or null).
 */
export function formatPropertyValue(
    value: unknown,
    type: PropertyType | undefined
): unknown {
    // If no type specified, return as-is (default text behavior)
    if (!type || type === "text") {
        return value;
    }

    // Handle empty/null values explicitly based on type expectations
    if (value === null || value === undefined || value === "") {
        switch (type) {
            case "checkbox":
                return false; // Checkboxes default to unchecked
            case "number":
                return null;  // Numbers default to null (empty field)
            case "multitext":
                return [];    // Lists default to empty array
            default:
                return null;
        }
    }

    switch (type) {
        case "number":
            // Ensure strictly numeric output
            if (typeof value === "number") return value;
            if (typeof value === "string") {
                const num = parseFloat(value);
                return isNaN(num) ? null : num;
            }
            return null;

        case "checkbox":
            // Coerce various truthy/falsy values to boolean
            if (typeof value === "boolean") return value;
            if (typeof value === "string") {
                return value.toLowerCase() === "true" || value === "1";
            }
            if (typeof value === "number") return value !== 0;
            return false;

        case "multitext":
            // Ensure array output
            if (Array.isArray(value)) return value;
            if (typeof value === "string") return [value];
            return [];

        case "date":
            // Format as YYYY-MM-DD
            if (typeof value === "string") {
                // Strip time component if present (e.g., "2023-01-01T12:00:00")
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
