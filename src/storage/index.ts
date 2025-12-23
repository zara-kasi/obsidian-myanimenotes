/**
 * Storage Module Exports
 */

export type { StorageConfig, SyncActionResult } from "./types";

export {
    saveMediaItem,
    saveMediaItems,
    saveMediaItemsByCategory
} from "./service";
