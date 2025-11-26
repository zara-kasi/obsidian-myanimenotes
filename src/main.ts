import { Plugin } from 'obsidian';
import { CassetteSettingTab } from './settings';
import { CassetteSettings, DEFAULT_SETTINGS } from './settings';
import { handleOAuthRedirect as handleMALRedirect } from './api/mal';
import { SyncManager, createSyncManager, AutoSyncManager, createAutoSyncManager } from './sync';
import { MediaCategory } from './models';
import type { CassetteIndex } from './storage/cassette';
import { createCassetteIndex } from './storage/cassette';
import { CassetteLockManager, createCassetteLockManager } from './storage/cassette';

export default class CassettePlugin extends Plugin {
  settings: CassetteSettings = DEFAULT_SETTINGS;
  settingsTab: CassetteSettingTab | null = null;
  syncManager: SyncManager | null = null;
  autoSyncManager: AutoSyncManager | null = null;
  cassetteIndex: CassetteIndex | null = null;
  lockManager: CassetteLockManager | null = null;

  async onload() {
    await this.loadSettings();

    // Initialize lock manager (instance-based, not global)
    this.lockManager = createCassetteLockManager();

    // Initialize sync manager
    this.syncManager = createSyncManager(this);
    
    // Initialize cassette index (lazy - just registers listeners, doesn't build index)
    try {
      this.cassetteIndex = await createCassetteIndex(this);
    } catch (error) {
      console.error('[Cassette] Failed to initialize index:', error);
      // Plugin can still work without index (uses fallback)
    }
  
    // Initialize auto-sync manager
    this.autoSyncManager = createAutoSyncManager(this);
    
    // Add ribbon icon for sync
    this.addRibbonIcon('cassette-tape', 'Cassette sync all', async (evt: MouseEvent) => {
      if (!this.syncManager) return;
      await this.syncManager.syncFromMAL();
    });

    // Add settings tab
    this.settingsTab = new CassetteSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);

    // Register OAuth protocol handler for MAL
    this.registerObsidianProtocolHandler('cassette-auth/mal', async (params) => {
      await handleMALRedirect(this, params);
    });

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
    if (this.cassetteIndex) {
      this.cassetteIndex.clear();
    }
    
    // Stop all auto-sync timers
    if (this.autoSyncManager) {
      this.autoSyncManager.stop();
    }
    this.autoSyncManager = null;
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
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
      id: 'sync-mal-all',
      name: 'Sync all from MyAnimeList',
      callback: async () => {
        if (!this.syncManager) return;
        await this.syncManager.syncFromMAL();
      },
    });

    // Sync anime only
    this.addCommand({
      id: 'sync-mal-anime',
      name: 'Sync anime from MyAnimeList',
      callback: async () => {
        if (!this.syncManager) return;
        await this.syncManager.syncAnime();
      },
    });

    // Sync manga only
    this.addCommand({
      id: 'sync-mal-manga',
      name: 'Sync manga from MyAnimeList',
      callback: async () => {
        if (!this.syncManager) return;
        await this.syncManager.syncManga();
      },
    });
    
    // Sync active statuses (watching anime + reading manga)
    this.addCommand({
      id: 'sync-mal-active',
      name: 'Sync currently Watching anime and  Reading manga',
      callback: async () => {
        if (!this.syncManager) return;
        await this.syncManager.syncActiveStatuses();
      },
    });
  }
}