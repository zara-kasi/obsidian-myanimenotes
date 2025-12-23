// Template configuration exports
export type { TemplateConfig, PropertyItem, PropertyMetadata } from "./types";
export {
    DEFAULT_ANIME_TEMPLATE,
    DEFAULT_MANGA_TEMPLATE,
    generatePropertyId
} from "./defaults";
export {
    getPropertyMetadata,
    getAvailableProperties,
    ANIME_PROPERTIES,
    MANGA_PROPERTIES
} from "./metadata";

// Template settings exports
export { renderTemplateSection, createTemplateSettingsState } from "./ui";
export type { TemplateSettingsState } from "./ui";
export { formatPropertyValue } from "./properties";
export { resolveTemplate } from "./parser";
