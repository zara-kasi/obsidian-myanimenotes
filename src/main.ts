// Main plugin entry point

import { Plugin } from 'obsidian';
import { CassetteSettingTab } from './settings/settings-tab';
import { CassetteSettings, DEFAULT_SETTINGS } from './settings/settings-interface';
import { handleOAuthRedirect } from './auth/mal';

export default class CassettePlugin extends Plugin {
  settings: CassetteSettings;

  async onload() {
    await this.loadSettings();

    // Add settings tab
    this.addSettingTab(new CassetteSettingTab(this.app, this));

    // Register OAuth protocol handler for MAL
    this.registerObsidianProtocolHandler('cassette-auth/mal', async (params) => {
      console.log('[Cassette] Received MAL OAuth callback');
      await handleOAuthRedirect(this, params);
    });

    console.log('[Cassette] Plugin loaded');
  }

  onunload() {
    console.log('[Cassette] Plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}