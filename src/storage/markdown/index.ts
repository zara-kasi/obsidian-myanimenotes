// Frontmatter builder
export {
  buildFrontmatterFromTemplate
} from './frontmatter-builder';

// Markdown generator
export {
  generateFrontmatterProperties,
  updateMarkdownFileFrontmatter
} from './markdown-generator';

// Property mapping (internal use only)
export type { PropertyMapping } from './property-mapping';
export {
  DEFAULT_PROPERTY_MAPPING
} from './property-mapping';