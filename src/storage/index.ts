/**
 * Storage Module Exports
 *
 * Central export point for all storage-related functionality
 */

// Main storage service (public API)
export type { StorageConfig, SyncActionResult } from "./storage-service";
export {
    saveMediaItem,
    saveMediaItems,
    saveMediaItemsByCategory
} from "./storage-service";
