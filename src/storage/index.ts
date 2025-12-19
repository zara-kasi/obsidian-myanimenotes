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

// MyAnimeNotes sync utilities (internal, but exported for testing/advanced use)
export {
  generateMyAnimeNotesSync,
  validateMyAnimeNotesSyncFormat,
  findFilesByMyAnimeNotesSync,
  findLegacyFiles,
  selectDeterministicFile
} from './myanimenotes';

// File utilities (internal, but exported for testing/advanced use)
export {
  ensureFolderExists,
  generateUniqueFilename
} from './file-utils';

// Markdown generation (internal, but exported for testing/advanced use)
export {
  generateFrontmatterProperties,
  updateMarkdownFileFrontmatter
} from './markdown';

// Frontmatter builder
export {
  buildFrontmatterFromTemplate
} from './markdown';