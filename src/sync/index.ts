// Main entry point for sync module

// Export types (type-only exports)
export type {
  UniversalMediaItem,
  UniversalPicture,
  UniversalAlternativeTitles,
  UniversalGenre,
  UniversalAuthor,
  UniversalSeason,
  SyncItemResult,
  SyncResult,
} from './types';

// Export enums (value exports)
export { MediaStatus, UserListStatus, MediaCategory } from './types';

// Re-export enum types for convenience
export type { MediaStatus, UserListStatus, MediaCategory } from './types';

// Export MAL services
export type { MALSyncOptions } from './services/mal-sync-service';
export { syncMAL, quickSyncMAL } from './services/mal-sync-service';

export {
  fetchCompleteMALAnimeList,
  fetchCompleteMALMangaList,
  fetchMALAnimeByStatus,
  fetchMALMangaByStatus,
} from './services/mal-api-service';

// Export transformers
export {
  transformMALAnime,
  transformMALManga,
  transformMALAnimeList,
  transformMALMangaList,
} from './transformers/mal-transformer';

// Export storage services
export type { StorageConfig } from './storage/storage-service';
export {
  saveMediaItem,
  saveMediaItems,
  saveMediaItemsByCategory,
} from './storage/storage-service';

// Export sync manager
export type { CompleteSyncOptions } from './sync-manager';
export { SyncManager, createSyncManager } from './sync-manager';