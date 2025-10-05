// Settings UI for Cassette plugin

import { App, PluginSettingTab, Setting } from 'obsidian';
import CassettePlugin from '../main';
import { startAuthFlow, logout, isAuthenticated } from '../auth/mal';

export class CassetteSettingTab extends PluginSettingTab {
  plugin: CassettePlugin;

  constructor(app: App, plugin: CassettePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ========================================================================
    // MAL Section
    // ========================================================================
    
    containerEl.createEl('h2', { text: 'MyAnimeList' });
    
    this.renderMALSection(containerEl);

    // ========================================================================
    // Simkl Section
    // ========================================================================
    
    containerEl.createEl('h2', { text: 'Simkl' });
    
    // Add Simkl settings here when ready

    // ========================================================================
    // Setup Section
    // ========================================================================
    
    containerEl.createEl('h2', { text: 'Setup' });
    
    // Add Setup settings here

    // ========================================================================
    // Sync Section
    // ========================================================================
    
    containerEl.createEl('h2', { text: 'Sync' });
    
    // Add Sync settings here

    // ========================================================================
    // Template Section
    // ========================================================================
    
    containerEl.createEl('h2', { text: 'Template' });
    
    // Add Template settings here

    // ========================================================================
    // About Section
    // ========================================================================
    
    containerEl.createEl('h2', { text: 'About' });
    
    new Setting(containerEl)
      .setName('Author')
      .setDesc(this.plugin.manifest.author);
    
    new Setting(containerEl)
      .setName('Version')
      .setDesc(this.plugin.manifest.version);
    
    new Setting(containerEl)
      .setName('Privacy')
      .setDesc('Cassette only talks to the APIs to fetch & update your media data. Nothing else is sent or shared—your data stays local.');

    new Setting(containerEl)
      .setName('GitHub')
      .setDesc('Get more info or report an issue.')
      .addButton(button =>
        button
          .setClass('mod-cta')
          .setButtonText('Open GitHub')
          .onClick(() => {
            window.open('https://github.com/zara-kasi/cassette', '_blank');
          })
      );
  }

  private renderMALSection(container: HTMLElement): void {
    const isAuth = isAuthenticated(this.plugin);

    // Show user info if authenticated
    if (isAuth && this.plugin.settings.malUserInfo) {
      const userInfo = this.plugin.settings.malUserInfo;
      
      const userSetting = new Setting(container)
        .setName('Logged in as')
        .setDesc(userInfo.name);

      // Add avatar if available
      if (userInfo.picture) {
        userSetting.controlEl.createEl('img', {
          attr: {
            src: userInfo.picture,
            alt: userInfo.name,
            style: 'width: 32px; height: 32px; border-radius: 50%; margin-left: 8px;'
          }
        });
      }
    }

    // Client ID
    new Setting(container)
      .setName('Client ID')
      .setDesc('Your MyAnimeList Client ID')
      .addText(text => text
        .setPlaceholder('Enter Client ID')
        .setValue(this.plugin.settings.malClientId)
        .onChange(async (value) => {
          this.plugin.settings.malClientId = value.trim();
          await this.plugin.saveSettings();
        }));

    // Client Secret (optional)
    new Setting(container)
      .setName('Client Secret')
      .setDesc('Your MyAnimeList Client Secret')
      .addText(text => {
        text
          .setPlaceholder('Enter Client Secret')
          .setValue(this.plugin.settings.malClientSecret || '')
          .onChange(async (value) => {
            this.plugin.settings.malClientSecret = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
        return text;
      });

    // Authentication button
    new Setting(container)
      .setName(isAuth ? 'Sign Out' : 'Authenticate')
      .setDesc(isAuth 
        ? 'Sign out from MyAnimeList' 
        : 'Sign in to MyAnimeList to sync your anime list'
      )
      .addButton(button => {
        button
          .setButtonText(isAuth ? 'Sign Out' : 'Authenticate')
          .setCta()
          .onClick(async () => {
            if (isAuth) {
              await logout(this.plugin);
              this.display(); // Refresh settings UI
            } else {
              await startAuthFlow(this.plugin);
            }
          });
        
        // Style the button based on auth state
        if (isAuth) {
          button.buttonEl.style.backgroundColor = 'var(--interactive-accent)';
        }
      });

    // Add info about getting credentials
    if (!isAuth) {
      new Setting(container)
        .setName('How to get credentials')
        .setDesc('Create an app at https://myanimelist.net/apiconfig to get your Client ID and Secret. Set the redirect URI to: obsidian://cassette-auth/mal')
        .then(setting => {
          setting.settingEl.style.borderTop = '1px solid var(--background-modifier-border)';
          setting.settingEl.style.paddingTop = '1em';
          setting.settingEl.style.marginTop = '1em';
        });
    }
  }
}