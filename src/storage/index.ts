/**
 * Storage Module Exports
 * 
 * Template system only - PropertyMapping removed
 */

// Main storage service (public API)
export type { SyncActionResult } from './storage-service';
export { 
  saveMediaItem, 
  saveMediaItems, 
  saveMediaItemsByCategory 
} from './storage-service';

// Template helper utilities
export {
  getTemplate,
  getFolderPath,
  getPropertyName,
  hasProperty,
  getOrderedProperties,
  getOrderedPropertyKeys,
  createPropertyMap
} from './markdown';

// Cassette sync utilities
export {
  generateCassetteSync,
  validateCassetteSyncFormat,
  findFilesByCassetteSync,
  findLegacyFiles,
  selectDeterministicFile
} from './cassette';

// File utilities
export {
  sanitizeFilename,
  sanitizeSynopsis,
  ensureFolderExists,
  generateUniqueFilename,
  formatPropertyAsWikiLink,
  getWikiLinkFormatType,
  formatDuration, 
  formatPlatformDisplay
} from './file-utils';

// Markdown generation
export {
  generateFrontmatterProperties,
  updateMarkdownFileFrontmatter
} from './markdown';

// Frontmatter builder
export {
  buildFrontmatterFromTemplate
} from './markdown';
