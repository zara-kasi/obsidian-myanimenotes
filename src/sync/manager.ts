import type MyAnimeNotesPlugin from "../main";
import type { UniversalMediaItem } from "../transformers";
import { MediaCategory } from "../transformers";
import { syncMAL } from "./service";
import { saveMediaItemsByCategory, type StorageConfig } from "../storage";
import { log, type Logger, showNotice } from "../utils";
import {
    DEFAULT_ANIME_TEMPLATE,
    DEFAULT_MANGA_TEMPLATE
} from "../settings/template";

// Local imports
import { SYNC_COOLDOWN_MS } from "./constants";
import type { CompleteSyncOptions, SyncResult, MALSyncOptions } from "./types";

/**
 * Sync manager class
 */
export class SyncManager {
    private debug: Logger;
    private isSyncing = false;
    private lastSyncTime = 0;

    constructor(private plugin: MyAnimeNotesPlugin) {
        this.debug = log.createSub("SyncManager");
        // Load persisted last sync time from settings
        this.lastSyncTime = plugin.settings.lastSuccessfulSync || 0;
    }

    /**
     * Gets storage configuration from plugin settings
     * NOW READS FROM TEMPLATE SETTINGS
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
     * Saves the last successful sync timestamp
     * (Note: Logic preserved, though internal usage is currently implicit in syncFromMAL)
     */
    private async saveLastSyncTimestamp(): Promise<void> {
        this.plugin.settings.lastSuccessfulSync = Date.now();
        await this.plugin.saveSettings();
        this.debug.info("Saved last sync timestamp");
    }

    /**
     * Check if sync can proceed, throw error if not
     */
    private checkSyncGuard(): boolean {
        // Prevent overlapping syncs
        if (this.isSyncing) {
            this.debug.warn(
                "Sync already in progress - blocking new sync request"
            );

            showNotice(this.plugin, "Sync already in progress.", 4000);
            return false;
        }

        // Enforce cooldown period
        const timeSinceLastSync = Date.now() - this.lastSyncTime;
        if (this.lastSyncTime > 0 && timeSinceLastSync < SYNC_COOLDOWN_MS) {
            const minutesRemaining = Math.ceil(
                (SYNC_COOLDOWN_MS - timeSinceLastSync) / 60000
            );
            this.debug.warn(
                `Sync cooldown active - ${minutesRemaining} minute${
                    minutesRemaining > 1 ? "s" : ""
                } remaining`
            );

            showNotice(
                this.plugin,
                `Please wait ${minutesRemaining} minute${
                    minutesRemaining > 1 ? "s" : ""
                } before syncing again.`,
                4000
            );
            return false;
        }

        return true;
    }

    /**
     * Performs a complete sync from MAL
     * @param options Sync options
     * @returns Synced items and result
     */
    async syncFromMAL(options: CompleteSyncOptions = {}): Promise<{
        items: UniversalMediaItem[];
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
            this.debug.info("Starting MAL sync...", options);

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

                    this.debug.info("Saved to vault:", savedPaths);
                } catch (saveError) {
                    this.debug.error("Failed to save to vault:", saveError);

                    const errorMessage =
                        saveError instanceof Error
                            ? saveError.message
                            : String(saveError);
                    showNotice(
                        this.plugin,
                        `⚠️ Synced but failed to save: ${errorMessage}`,
                        5000
                    );
                }
            }

            // Update last sync time and save to settings
            this.lastSyncTime = Date.now();
            this.plugin.settings.lastSuccessfulSync = this.lastSyncTime;
            await this.plugin.saveSettings();

            return { items, result, savedPaths };
        } catch (error) {
            this.debug.error("Sync failed:", error);

            throw error;
        } finally {
            // Always mark sync as complete
            this.isSyncing = false;
        }
    }

    /**
     * Quick sync for a specific category
     * @param category anime or manga
     * @param saveToVault Whether to save to vault
     * @returns Synced items
     */
    async quickSync(
        category: MediaCategory,
        saveToVault = true
    ): Promise<UniversalMediaItem[]> {
        this.debug.info(`Quick sync for ${category}...`);

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
     * Syncs only anime
     * @param saveToVault Whether to save to vault
     * @returns Synced anime items
     */
    async syncAnime(saveToVault = true): Promise<UniversalMediaItem[]> {
        return this.quickSync(MediaCategory.ANIME, saveToVault);
    }

    /**
     * Syncs only manga
     * @param saveToVault Whether to save to vault
     * @returns Synced manga items
     */
    async syncManga(saveToVault = true): Promise<UniversalMediaItem[]> {
        return this.quickSync(MediaCategory.MANGA, saveToVault);
    }

    /**
     * Syncs active statuses: Watching anime + Reading manga
     * Used by both the "Sync active" command and optimized auto-sync
     */
    async syncActiveStatuses(
        saveToVault = true
    ): Promise<UniversalMediaItem[]> {
        this.debug.info(
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
     * Gets sync statistics
     * @returns Sync statistics
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
 * Creates a sync manager instance
 * @param plugin Plugin instance
 * @returns Sync manager
 */
export function createSyncManager(plugin: MyAnimeNotesPlugin): SyncManager {
    return new SyncManager(plugin);
}
