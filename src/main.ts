import { Plugin } from "obsidian";
import { MyAnimeNotesSettingTab } from "./settings";
import { MyAnimeNotesSettings, DEFAULT_SETTINGS } from "./settings";
import { handleOAuthRedirect as handleMALRedirect } from "./auth";
import { SyncManager, createSyncManager } from "./sync";
import { AutoSyncManager, createAutoSyncManager } from "./sync/auto";
import type { MyAnimeNotesIndex } from "./storage/myanimenotes";
import { createMyAnimeNotesIndex } from "./storage/myanimenotes";
import {
    MyAnimeNotesLockManager,
    createMyAnimeNotesLockManager
} from "./storage/myanimenotes";

export default class MyAnimeNotesPlugin extends Plugin {
    settings: MyAnimeNotesSettings = DEFAULT_SETTINGS;
    settingsTab: MyAnimeNotesSettingTab | null = null;
    syncManager: SyncManager | null = null;
    autoSyncManager: AutoSyncManager | null = null;
    myanimenotesIndex: MyAnimeNotesIndex | null = null;
    lockManager: MyAnimeNotesLockManager | null = null;

    async onload() {
        await this.loadSettings();

        // Initialize lock manager (instance-based, not global)
        this.lockManager = createMyAnimeNotesLockManager();

        // Initialize sync manager
        this.syncManager = createSyncManager(this);

        // Initialize myanimenotes index (lazy - just registers listeners, doesn't build index)
        try {
            this.myanimenotesIndex = await createMyAnimeNotesIndex(this);
        } catch (error) {
            console.error("[MyAnimeNotes] Failed to initialize index:", error);
            // Plugin can still work without index (uses fallback)
        }

        // Initialize auto-sync manager
        this.autoSyncManager = createAutoSyncManager(this);

        // Add ribbon icon for sync
        this.addRibbonIcon(
            "cloud-download",
            "Myanimenotes sync all",
            async (evt: MouseEvent) => {
                if (!this.syncManager) return;
                await this.syncManager.syncFromMAL();
            }
        );

        // Add settings tab
        this.settingsTab = new MyAnimeNotesSettingTab(this.app, this);
        this.addSettingTab(this.settingsTab);

        // Register OAuth protocol handler for MAL
        this.registerObsidianProtocolHandler(
            "myanimenotes-auth/mal",
            async params => {
                await handleMALRedirect(this, params);
            }
        );

        // Add commands
        this.addCommands();
    }

    onunload() {
        // Clear and cleanup lock manager (prevents global state leaks)
        if (this.lockManager) {
            this.lockManager.clear();
            this.lockManager = null;
        }

        // Clear index on unload
        if (this.myanimenotesIndex) {
            this.myanimenotesIndex.clear();
        }

        // Stop all auto-sync timers
        if (this.autoSyncManager) {
            this.autoSyncManager.stop();
        }
        this.autoSyncManager = null;
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    refreshSettingsUI(): void {
        if (this.settingsTab) {
            this.settingsTab.display();
        }
    }

    /**
     * Adds plugin commands
     */
    private addCommands(): void {
        // Sync all from MAL
        this.addCommand({
            id: "sync-mal-all",
            name: "Sync all from myanimelist",
            callback: async () => {
                if (!this.syncManager) return;
                await this.syncManager.syncFromMAL();
            }
        });

        // Sync anime only
        this.addCommand({
            id: "sync-mal-anime",
            name: "Sync anime from myanimelist",
            callback: async () => {
                if (!this.syncManager) return;
                await this.syncManager.syncAnime();
            }
        });

        // Sync manga only
        this.addCommand({
            id: "sync-mal-manga",
            name: "Sync manga from myanimelist",
            callback: async () => {
                if (!this.syncManager) return;
                await this.syncManager.syncManga();
            }
        });

        // Sync active statuses (watching anime + reading manga)
        this.addCommand({
            id: "sync-mal-active",
            name: "Sync currently watching anime and reading manga",
            callback: async () => {
                if (!this.syncManager) return;
                await this.syncManager.syncActiveStatuses();
            }
        });
    }
}
