/**
 * Storage Module Exports
 * 
 * Central export point for all storage-related functionality
 */

// Main storage service (public API)
export type { StorageConfig, SyncActionResult } from './storage-service';
export { 
  saveMediaItem, 
  saveMediaItems, 
  saveMediaItemsByCategory 
} from './storage-service';

// Property mapping
export type { PropertyMapping } from './markdown';
export { 
  DEFAULT_PROPERTY_MAPPING, 
  getMappedPropertyName 
} from './markdown';

// Cassette sync utilities (internal, but exported for testing/advanced use)
export {
  generateCassetteSync,
  validateCassetteSyncFormat,
  findFilesByCassetteSync,
  findLegacyFiles,
  selectDeterministicFile
} from './cassette';

// File utilities (internal, but exported for testing/advanced use)
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

// Markdown generation (internal, but exported for testing/advanced use)
export {
  generateFrontmatterProperties,
  updateMarkdownFileFrontmatter
} from './markdown';

// Frontmatter builder
export {
  buildSyncedFrontmatterProperties
} from './markdown';