// Main plugin entry point with sync support

import { Plugin } from 'obsidian';
import { CassetteSettingTab } from './settings/settings-tab';
import { CassetteSettings, DEFAULT_SETTINGS } from './settings/settings-interface';
import { handleOAuthRedirect as handleMALRedirect } from './auth/mal';
import { handleOAuthRedirect as handleSimklRedirect } from './auth/simkl';
import { SyncManager, createSyncManager, MediaCategory } from './sync';

export default class CassettePlugin extends Plugin {
  settings: CassetteSettings;
  settingsTab: CassetteSettingTab | null = null;
  syncManager: SyncManager | null = null;
  autoSyncManager: AutoSyncManager | null = null;

  async onload() {
    await this.loadSettings();

    // Initialize sync manager
    this.syncManager = createSyncManager(this);
    
      // Initialize auto-sync manager
    this.autoSyncManager = createAutoSyncManager(this);
    
    // Start auto-sync if enabled
    this.autoSyncManager.start();
    
    // Add ribbon icon for sync
    this.addRibbonIcon('refresh-cw', 'Cassette sync all', async (evt: MouseEvent) => {
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

    // Register OAuth protocol handler for SIMKL
    this.registerObsidianProtocolHandler('cassette-auth/simkl', async (params) => {
      await handleSimklRedirect(this, params);
    });

    // Add commands
    this.addCommands();

    
  }

  onunload() {
    // Stop auto-sync when plugin unloads
    if (this.autoSyncManager) {
      this.autoSyncManager.stop();
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Restart auto-sync when settings change
    // (in case interval or enabled state changed)
    if (this.autoSyncManager) {
      this.autoSyncManager.restart();
    }
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

    // Sync currently watching anime
    this.addCommand({
      id: 'sync-mal-watching',
      name: 'Sync currently watching anime',
      callback: async () => {
        if (!this.syncManager) return;
        await this.syncManager.syncByStatus(MediaCategory.ANIME, 'watching');
      },
    });

    // Sync currently reading manga
    this.addCommand({
      id: 'sync-mal-reading',
      name: 'Sync currently reading manga',
      callback: async () => {
        if (!this.syncManager) return;
        await this.syncManager.syncByStatus(MediaCategory.MANGA, 'reading');
      },
    });
  }
}