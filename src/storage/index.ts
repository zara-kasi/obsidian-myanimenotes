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
  getFormatTypeForProperty,
  formatDuration, 
  formatPlatformDisplay
} from './file-utils';

// Frontmatter utilities (internal, but exported for testing/advanced use)
export {
  buildSyncedFrontmatterProperties,
  mergeFrontmatter,
  serializeFrontmatter
} from './markdown';

// Markdown generation (internal, but exported for testing/advanced use)
export {
  parseExistingFile,
  generateMarkdownWithCassetteSync
} from './markdown';