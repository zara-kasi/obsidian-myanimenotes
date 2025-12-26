import { Plugin } from "obsidian";
import { MyAnimeNotesSettingTab } from "./settings";
import { MyAnimeNotesSettings, DEFAULT_SETTINGS } from "./settings";
import { handleOAuthRedirect as handleMALRedirect } from "./auth";
import { SyncManager, createSyncManager } from "./sync";
import { AutoSyncManager, createAutoSyncManager } from "./sync/auto";
import { MyAnimeNotesLockManager, createMyAnimeNotesLockManager } from "./core";
import { setNotificationsEnabled } from "./utils/notice";
import { logger } from "./utils/logger";

/**
 * The main entry point for the MyAnimeNotes Obsidian plugin.
 *
 * This class handles the plugin lifecycle (load/unload), initialization of managers
 * (sync, auto-sync, settings), and registration of UI elements (ribbon icons, settings tabs, commands).
 */
export default class MyAnimeNotesPlugin extends Plugin {
    /**
     * The current configuration settings for the plugin.
     * Initialized with defaults and overwritten by user data during load.
     */
    settings: MyAnimeNotesSettings = DEFAULT_SETTINGS;

    /**
     * Reference to the settings tab instance to allow UI refreshes.
     */
    settingsTab: MyAnimeNotesSettingTab | null = null;

    /**
     * Manages manual synchronization tasks (fetching data from MAL and updating notes).
     */
    syncManager: SyncManager | null = null;

    /**
     * Manages automated background synchronization based on intervals.
     */
    autoSyncManager: AutoSyncManager | null = null;

    /**
     * Manages concurrency locks to prevent race conditions during sync operations.
     */
    lockManager: MyAnimeNotesLockManager | null = null;

    /**
     * Called when the plugin is loaded by Obsidian.
     *
     * This method:
     * 1. Loads settings.
     * 2. Initializes core managers (Lock, Sync, AutoSync).
     * 3. Configures global utilities (Logger, Notifications).
     * 4. Adds UI elements (Ribbon icon, Settings tab).
     * 5. Registers the OAuth protocol handler.
     * 6. Registers application commands.
     */
    async onload() {
        await this.loadSettings();

        // Initialize lock manager (instance-based, not global) to handle concurrency safely.
        this.lockManager = createMyAnimeNotesLockManager();

        // Initialize sync manager with a reference to this plugin instance.
        this.syncManager = createSyncManager(this);

        // Initialize auto-sync manager to handle background tasks.
        this.autoSyncManager = createAutoSyncManager(this);

        // Register Debug Mode based on user settings to control log verbosity.
        logger.setDebugMode(this.settings.debugMode);

        // Set the global notification state based on user preference.
        setNotificationsEnabled(this.settings.notificationsEnabled);

        // Add a clickable icon to the Obsidian ribbon to trigger a manual sync of all lists.
        this.addRibbonIcon(
            "cloud-download",
            "Myanimenotes sync all",
            async () => {
                if (!this.syncManager) return;
                await this.syncManager.syncFromMAL();
            }
        );

        // Initialize and add the settings tab to the plugin configuration UI.
        this.settingsTab = new MyAnimeNotesSettingTab(this.app, this);
        this.addSettingTab(this.settingsTab);

        // Register a custom protocol handler for OAuth redirects from MyAnimeList.
        // Listens for: obsidian://myanimenotes-auth/mal
        this.registerObsidianProtocolHandler(
            "myanimenotes-auth/mal",
            async params => {
                await handleMALRedirect(this, params);
            }
        );

        // Register all command palette actions.
        this.addCommands();
    }

    /**
     * Called when the plugin is disabled or unloaded.
     *
     * Performs necessary cleanup:
     * 1. Clears lock manager state.
     * 2. Stops any running auto-sync timers to prevent memory leaks.
     */
    onunload() {
        // Clear and cleanup lock manager (prevents global state leaks across reloads).
        if (this.lockManager) {
            this.lockManager.clear();
            this.lockManager = null;
        }

        // Stop all active auto-sync timers.
        if (this.autoSyncManager) {
            this.autoSyncManager.stop();
        }
        this.autoSyncManager = null;
    }

    /**
     * Loads settings from the file system.
     * Merges user-saved data with the default settings to ensure new fields are populated.
     */
    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            (await this.loadData()) as Partial<MyAnimeNotesSettings>
        );
    }

    /**
     * Saves the current settings to the file system.
     * Also immediately applies settings that affect global utilities (logging, notifications).
     */
    async saveSettings() {
        await this.saveData(this.settings);
        // Update both utilities immediately when settings change programmatically or via UI.
        logger.setDebugMode(this.settings.debugMode);
        setNotificationsEnabled(this.settings.notificationsEnabled);
    }

    /**
     * Triggers a UI refresh for the settings tab.
     * Useful when authentication state changes or settings are updated programmatically.
     */
    refreshSettingsUI(): void {
        if (this.settingsTab) {
            this.settingsTab.display();
        }
    }

    /**
     * Registers all user-facing commands in the Obsidian Command Palette.
     */
    private addCommands(): void {
        // Command: Sync everything (Anime + Manga)
        this.addCommand({
            id: "sync-mal-all",
            name: "Sync all from myanimelist",
            callback: async () => {
                if (!this.syncManager) return;
                await this.syncManager.syncFromMAL();
            }
        });

        // Command: Sync Anime list only
        this.addCommand({
            id: "sync-mal-anime",
            name: "Sync anime from myanimelist",
            callback: async () => {
                if (!this.syncManager) return;
                await this.syncManager.syncAnime();
            }
        });

        // Command: Sync Manga list only
        this.addCommand({
            id: "sync-mal-manga",
            name: "Sync manga from myanimelist",
            callback: async () => {
                if (!this.syncManager) return;
                await this.syncManager.syncManga();
            }
        });

        // Command: Sync only active statuses (Watching + Reading)
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
