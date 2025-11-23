// Frontmatter builder
export {
  buildSyncedFrontmatterProperties
} from './frontmatter-builder';

// Markdown generator
export {
  generateFrontmatterProperties,
  updateMarkdownFileFrontmatter
} from './markdown-generator';

// Property mapping
export type { PropertyMapping } from './property-mapping';
export {
  DEFAULT_PROPERTY_MAPPING,
  getMappedPropertyName
} from './property-mapping';