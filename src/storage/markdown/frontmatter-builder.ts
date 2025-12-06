/**
 * Frontmatter Builder
 * 
 * Builds frontmatter properties from media items with cassette as primary key
 * Handles merging with existing frontmatter while preserving user properties
 * 
 * REFACTORED: Removed manual YAML serialization
 * Now returns plain objects - Obsidian's FileManager.processFrontMatter handles YAML
 */

import type { UniversalMediaItem } from '../../models';
import type { TemplateConfig } from '../../settings/template-config';
import { resolveTemplate } from './template-parser';




/**
 * Builds frontmatter properties from template configuration
 * Processes template properties in order and resolves values from media item
 * 
 * @param item - Universal media item
 * @param template - Template configuration with property definitions
 * @param cassetteSync - Cassette identifier
 * @returns Frontmatter properties object
 */

export function buildFrontmatterFromTemplate(
  item: UniversalMediaItem,
  template: TemplateConfig,
  cassetteSync: string
): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // Process each template property in order
  for (const prop of template.properties) {
    // Handle permanent properties (special keywords)
    if (prop.template === 'cassette') {
      properties[prop.customName] = cassetteSync;
      continue;
    }
    
    if (prop.template === 'synced') {
      if (item.updatedAt) {
        properties[prop.customName] = item.updatedAt;
      }
      continue;
    }
    
    // Resolve template string using template parser
    const resolvedValue = resolveTemplate(prop.template, item);
    
    // Only add property if we got a value
    if (resolvedValue !== undefined && resolvedValue !== null && resolvedValue !== '') {
      properties[prop.customName] = resolvedValue;
    }
  }
  
  return properties;
}
