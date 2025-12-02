/**
 * Markdown Module Exports
 * 
 * Template system only - PropertyMapping removed
 */

// Frontmatter builder
export {
  buildFrontmatterFromTemplate
} from './frontmatter-builder';

// Markdown generator
export {
  generateFrontmatterProperties,
  updateMarkdownFileFrontmatter
} from './markdown-generator';

// Template helper utilities
export {
  getTemplate,
  getFolderPath,
  getPropertyName,
  hasProperty,
  getOrderedProperties,
  getOrderedPropertyKeys,
  createPropertyMap
} from './template-helper';
