/**
 * Template Helper Utilities
 * 
 * Provides utilities to work with TemplateConfig
 * This is the ONLY way to configure properties - no more property mapping
 */

import type { TemplateConfig, PropertyItem } from '../../settings/template-config';
import { DEFAULT_ANIME_TEMPLATE, DEFAULT_MANGA_TEMPLATE } from '../../settings/template-config';

/**
 * Gets the template for a specific category from plugin settings
 * Always returns a valid template (uses defaults if not configured)
 * 
 * @param plugin Plugin instance
 * @param category 'anime' or 'manga'
 * @returns TemplateConfig for the category
 */
export function getTemplate(
  plugin: any,
  category: 'anime' | 'manga'
): TemplateConfig {
  const template = category === 'anime' 
    ? plugin.settings.animeTemplate 
    : plugin.settings.mangaTemplate;
  
  // Return template or default
  if (template) {
    return template;
  }
  
  // Use defaults
  return category === 'anime' 
    ? { ...DEFAULT_ANIME_TEMPLATE }
    : { ...DEFAULT_MANGA_TEMPLATE };
}

/**
 * Gets the folder path for a category from template
 * 
 * @param plugin Plugin instance
 * @param category 'anime' or 'manga'
 * @returns Folder path string
 */
export function getFolderPath(
  plugin: any,
  category: 'anime' | 'manga'
): string {
  const template = getTemplate(plugin, category);
  return template.folderPath;
}

/**
 * Gets the custom property name for a given key from template
 * Returns undefined if property doesn't exist in template
 * 
 * @param template Template configuration
 * @param propertyKey Property key (e.g., 'title', 'numEpisodes')
 * @returns Custom name or undefined if not found
 */
export function getPropertyName(
  template: TemplateConfig,
  propertyKey: string
): string | undefined {
  const prop = template.properties.find(p => p.key === propertyKey);
  return prop?.customName;
}

/**
 * Checks if a property exists in the template
 * 
 * @param template Template configuration
 * @param propertyKey Property key to check
 * @returns true if property exists in template
 */
export function hasProperty(
  template: TemplateConfig,
  propertyKey: string
): boolean {
  return template.properties.some(prop => prop.key === propertyKey);
}

/**
 * Gets all properties from template in order
 * Useful for generating frontmatter in the correct order
 * 
 * @param template Template configuration
 * @returns Array of property items sorted by order
 */
export function getOrderedProperties(template: TemplateConfig) {
  return template.properties
    .slice() // Create copy
    .sort((a, b) => a.order - b.order);
}

/**
 * Gets property keys in order
 * 
 * @param template Template configuration
 * @returns Array of property keys in order
 */
export function getOrderedPropertyKeys(template: TemplateConfig): string[] {
  return getOrderedProperties(template).map(prop => prop.key);
}

/**
 * Creates a property lookup map for fast access
 * Maps property key -> custom name
 * 
 * @param template Template configuration
 * @returns Map of key to custom name
 */
export function createPropertyMap(
  template: TemplateConfig
): Map<string, string> {
  const map = new Map<string, string>();
  
  template.properties.forEach(prop => {
    if (prop.key && prop.customName) {
      map.set(prop.key, prop.customName);
    }
  });
  
  return map;
}
