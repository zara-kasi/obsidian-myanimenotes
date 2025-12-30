import type { PropertyType } from "./properties";

/**
 * Single property in a template
 */

export interface PropertyItem {
    id: string; // Unique ID for drag-drop (e.g., 'prop-1', 'prop-2')
    template: string; // Template string with {{variables}} and custom text
    customName: string; // User's custom property name (e.g., 'episodes')
    order: number; // Sort order for display
    type?: PropertyType; // Format type for this property
}

/**
 * Template configuration for anime or manga
 */
export interface TemplateConfig {
    fileName: string;
    folderPath: string;
    properties: PropertyItem[];
    noteContent: string;
}

/**
 * Property metadata for available properties
 */
export interface PropertyMetadata {
    key: string; // Template variable (e.g., 'title')
    label: string; // Display name in dropdown (e.g., 'Title')
    defaultName: string; // Default property name (e.g., 'title')
}
