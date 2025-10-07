// Main entry point for sync module

// Export types
export type {
  UniversalMediaItem,
  MediaStatus,
  UserListStatus,
  MediaCategory,
  UniversalPicture,
  UniversalAlternativeTitles,
  UniversalGenre,
  UniversalAuthor,
  UniversalSeason,
  SyncItemResult,
  SyncResult,
} from './types';

export {
  MediaStatus,
  UserListStatus,
  MediaCategory,
} from './types';

// Export MAL services
export {
  syncMAL,
  quickSyncMAL,
  type MALSyncOptions,
} from './services/mal-sync-service';

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
export {
  saveMediaItem,
  saveMediaItems,
  saveMediaItemsByCategory,
  type StorageConfig,
} from './storage/storage-service';

// Export sync manager
export {
  SyncManager,
  createSyncManager,
  type CompleteSyncOptions,
} from './sync-manager';