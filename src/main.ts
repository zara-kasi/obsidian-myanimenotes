import { Plugin } from 'obsidian';
import { CassetteSettingTab } from './settings';
import { CassetteSettings, DEFAULT_SETTINGS } from './settings';
import { handleOAuthRedirect as handleMALRedirect } from './api/mal';
import { SyncManager, createSyncManager, AutoSyncManager, createAutoSyncManager } from './sync';
import { MediaCategory } from './models';
import type { CassetteIndex } from './storage/cassette';
import { createCassetteIndex } from './storage/cassette';

export default class CassettePlugin extends Plugin {
  settings: CassetteSettings;
  settingsTab: CassetteSettingTab | null = null;
  syncManager: SyncManager | null = null;
  autoSyncManager: AutoSyncManager | null = null;
public cassetteIndex: CassetteIndex | null = null;

  async onload() {
  await this.loadSettings();

  // Initialize sync manager
  this.syncManager = createSyncManager(this);
  // Initialize cassette index (after settings loaded)
    try {
      this.cassetteIndex = await createCassetteIndex(this);
      debug.log('[Cassette] Index initialized successfully');
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