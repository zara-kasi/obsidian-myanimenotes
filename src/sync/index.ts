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

// Export enums (value exports only - no type exports to avoid duplicates)
export { MediaStatus, UserListStatus, MediaCategory } from './types';

// Export MAL services
export type { MALSyncOptions } from './services/mal-sync-service';
export { syncMAL } from './services/mal-sync-service';

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

// Export property mapping types
export type { PropertyMapping } from './storage/property-mapping';

export {
  DEFAULT_PROPERTY_MAPPING,
  getMappedPropertyName,
} from './storage/property-mapping';

// Export sync manager
export type { CompleteSyncOptions } from './sync-manager';
export { SyncManager, createSyncManager } from './sync-manager';
// Export auto-sync manager
export { AutoSyncManager, createAutoSyncManager } from './auto-sync-manager';