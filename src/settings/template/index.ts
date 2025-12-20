// Template configuration exports
export type { TemplateConfig, PropertyItem, PropertyMetadata } from "./config";
export {
    DEFAULT_ANIME_TEMPLATE,
    DEFAULT_MANGA_TEMPLATE,
    getPropertyMetadata,
    getAvailableProperties,
    generatePropertyId
} from "./config";

// Template settings exports
export { renderTemplateSection, createTemplateSettingsState } from "./ui";
export type { TemplateSettingsState } from "./ui";
export { formatPropertyValue } from "./type";
