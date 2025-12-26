import type MyAnimeNotesPlugin from "../main";
import { MediaCategory, type MediaItem } from "../models";
import { syncMAL } from "./service";
import { saveMediaItemsByCategory, type StorageConfig } from "../storage";
import { showNotice } from "../utils/notice";
import { logger } from "../utils/logger";
import {
    DEFAULT_ANIME_TEMPLATE,
    DEFAULT_MANGA_TEMPLATE
} from "../settings/template";
import { SYNC_COOLDOWN_MS } from "./constants";
import type { CompleteSyncOptions, SyncResult, MALSyncOptions } from "./types";

const log = new logger("SyncManager");

/**
 * SyncManager orchestrates the synchronization process between MyAnimeList and the Obsidian vault.
 *
 * Responsibilities:
 * - Managing the sync lifecycle (start, execution, finish).
 * - Enforcing rate limits (cooldowns) and concurrency locks (preventing overlapping syncs).
 * - routing data to the storage layer based on template settings.
 * - Providing helper methods for specific sync operations (Anime-only, Manga-only, Active-only).
 */
export class SyncManager {
    /** Flag to prevent multiple concurrent sync operations. */
    private isSyncing = false;

    /** Timestamp of the last successful sync completion. */
    private lastSyncTime = 0;

    /**
     * Creates a new SyncManager instance.
     * @param plugin - Reference to the main plugin instance.
     */
    constructor(private plugin: MyAnimeNotesPlugin) {
        // Load persisted last sync time from settings to enforce cooldowns across restarts
        this.lastSyncTime = plugin.settings.lastSuccessfulSync || 0;
    }

    /**
     * Retrieves storage configuration (folder paths) from plugin settings.
     * * Prioritizes paths defined in user templates, falling back to defaults if necessary.
     * @returns Configuration object containing destination folders for Anime and Manga.
     */
    private getStorageConfig(): StorageConfig {
        // Get folder paths from templates (with fallback to defaults)
        const animeFolder =
            this.plugin.settings.animeTemplate?.folderPath ||
            DEFAULT_ANIME_TEMPLATE.folderPath;

        const mangaFolder =
            this.plugin.settings.mangaTemplate?.folderPath ||
            DEFAULT_MANGA_TEMPLATE.folderPath;

        return {
            animeFolder,
            mangaFolder,
            createFolders: true
        };
    }

    /**
     * Persists the current timestamp as the last successful sync time.
     * Updated automatically at the end of a successful `syncFromMAL` run.
     */
    private async saveLastSyncTimestamp(): Promise<void> {
        this.plugin.settings.lastSuccessfulSync = Date.now();
        await this.plugin.saveSettings();
        log.debug("Saved last sync timestamp");
    }

    /**
     * Guard clause to check if a sync operation is allowed.
     * * Checks:
     * 1. Is a sync already in progress? (Concurrency lock)
     * 2. Has enough time passed since the last sync? (Cooldown enforcement)
     * * @returns `true` if sync is allowed, `false` otherwise (and shows a UI notice).
     */
    private checkSyncGuard(): boolean {
        // Prevent overlapping syncs
        if (this.isSyncing) {
            log.debug("Sync already in progress - blocking new sync request");

            showNotice("Sync already in progress.", "warning");
            return false;
        }

        // Enforce cooldown period
        const timeSinceLastSync = Date.now() - this.lastSyncTime;
        if (this.lastSyncTime > 0 && timeSinceLastSync < SYNC_COOLDOWN_MS) {
            const minutesRemaining = Math.ceil(
                (SYNC_COOLDOWN_MS - timeSinceLastSync) / 60000
            );
            log.debug(
                `Sync cooldown active - ${minutesRemaining} minute${
                    minutesRemaining > 1 ? "s" : ""
                } remaining`
            );

            showNotice(
                `Please wait ${minutesRemaining} minute${
                    minutesRemaining > 1 ? "s" : ""
                } before syncing again.`,
                "warning",
                4000
            );

            return false;
        }

        return true;
    }

    /**
     * Performs a complete synchronization from MyAnimeList.
     * * Workflow:
     * 1. Check Guard (Cooldown/Lock).
     * 2. Fetch data from MAL API via `syncMAL` service.
     * 3. Save media items to the vault (Markdown files).
     * 4. Update last sync timestamp.
     * * @param options - Configuration options for the sync (filters, storage config, etc.).
     * @returns Promise resolving to the synced items, execution result metrics, and saved file paths.
     */
    async syncFromMAL(options: CompleteSyncOptions = {}): Promise<{
        items: MediaItem[];
        result: SyncResult;
        savedPaths?: { anime: string[]; manga: string[] };
    }> {
        // Check sync guard
        if (!this.checkSyncGuard()) {
            // Guard check failed - return empty result, no error
            return {
                items: [],
                result: {
                    success: false,
                    itemsProcessed: 0,
                    itemsSucceeded: 0,
                    itemsFailed: 0,
                    results: [],
                    errors: [],
                    startTime: Date.now(),
                    endTime: Date.now()
                }
            };
        }
        this.isSyncing = true;

        try {
            log.debug("Starting MAL sync...", options);

            // Perform sync
            const { items, result } = await syncMAL(this.plugin, options);

            // Save to vault if enabled
            let savedPaths: { anime: string[]; manga: string[] } | undefined;

            if (options.saveToVault !== false && items.length > 0) {
                try {
                    const storageConfig =
                        options.storageConfig || this.getStorageConfig();

                    savedPaths = await saveMediaItemsByCategory(
                        this.plugin,
                        items,
                        storageConfig
                    );

                    log.debug("Saved to vault:", savedPaths);
                } catch (saveError) {
                    log.error("Failed to save to vault:", saveError);

                    const errorMessage =
                        saveError instanceof Error
                            ? saveError.message
                            : String(saveError);
                    showNotice(
                        `Synced but failed to save: ${errorMessage}`,
                        "warning",
                        5000
                    );
                }
            }

            // Update last sync time and save to settings
            this.lastSyncTime = Date.now();
            this.plugin.settings.lastSuccessfulSync = this.lastSyncTime;
            await this.plugin.saveSettings();

            // Sync success notice
            showNotice("MAL sync completed", "success");

            return { items, result, savedPaths };
        } catch (error) {
            log.error("Sync failed:", error);

            throw error;
        } finally {
            // Always mark sync as complete to release the lock
            this.isSyncing = false;
        }
    }

    /**
     * Helper to perform a quick sync for a specific media category.
     * * @param category - The media type (`anime` or `manga`).
     * @param saveToVault - Whether to write the results to Markdown files (default: true).
     * @returns List of synced items.
     */
    async quickSync(
        category: MediaCategory,
        saveToVault = true
    ): Promise<MediaItem[]> {
        log.debug(`Quick sync for ${category}...`);

        const options: MALSyncOptions = {
            syncAnime: category === MediaCategory.ANIME,
            syncManga: category === MediaCategory.MANGA
        };

        const completeOptions: CompleteSyncOptions = {
            ...options,
            saveToVault
        };

        const { items } = await this.syncFromMAL(completeOptions);
        return items;
    }

    /**
     * Wrapper to sync only Anime items.
     * * @param saveToVault - Whether to save files.
     * @returns Synced anime items.
     */
    async syncAnime(saveToVault = true): Promise<MediaItem[]> {
        return this.quickSync(MediaCategory.ANIME, saveToVault);
    }

    /**
     * Wrapper to sync only Manga items.
     * * @param saveToVault - Whether to save files.
     * @returns Synced manga items.
     */
    async syncManga(saveToVault = true): Promise<MediaItem[]> {
        return this.quickSync(MediaCategory.MANGA, saveToVault);
    }

    /**
     * Specialized sync for active content only.
     * Fetches 'Watching' status for Anime and 'Reading' status for Manga.
     * * Used by:
     * - "Sync active" command.
     * - Optimized auto-sync intervals (to reduce API load).
     * * @param saveToVault - Whether to save files.
     * @returns Synced active items.
     */
    async syncActiveStatuses(saveToVault = true): Promise<MediaItem[]> {
        log.debug(
            "Syncing active statuses (watching anime + reading manga)..."
        );

        const options: CompleteSyncOptions = {
            syncAnime: true,
            syncManga: true,
            animeStatuses: ["watching"],
            mangaStatuses: ["reading"],
            saveToVault
        };

        const { items } = await this.syncFromMAL(options);
        return items;
    }

    /**
     * Retrieves basic statistics about the sync state.
     * * @returns Object containing the last successful sync timestamp.
     */
    getSyncStats(): {
        totalItems?: number;
        lastSyncTime?: number;
    } {
        return {
            totalItems: undefined,
            lastSyncTime: this.plugin.settings.lastSuccessfulSync
        };
    }
}

/**
 * Factory function to create a new SyncManager.
 * * @param plugin - The Obsidian plugin instance.
 * @returns A new SyncManager instance.
 */
export function createSyncManager(plugin: MyAnimeNotesPlugin): SyncManager {
    return new SyncManager(plugin);
}
