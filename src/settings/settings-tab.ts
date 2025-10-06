// Settings UI for Cassette plugin

import { App, PluginSettingTab, Setting } from 'obsidian';
import CassettePlugin from '../main';
import { startAuthFlow as startMALAuth, logout as malLogout, isAuthenticated as isMALAuthenticated } from '../auth/mal';
import { startAuthFlow as startSimklAuth, logout as simklLogout, isAuthenticated as isSimklAuthenticated } from '../auth/simkl';

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
    // SIMKL Section
    // ========================================================================
    
    containerEl.createEl('h2', { text: 'SIMKL' });
    
    this.renderSimklSection(containerEl);

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
    const isAuth = isMALAuthenticated(this.plugin);

    // Show user info if authenticated
    if (isAuth && this.plugin.settings.malUserInfo) {
      const userInfo = this.plugin.settings.malUserInfo;
      
      const userSetting = new Setting(container);
      
      // Create a container for avatar and name
      const userInfoContainer = userSetting.controlEl.createDiv({ cls: 'cassette-user-info' });
      
      // Add avatar if available
      if (userInfo.picture) {
        userInfoContainer.createEl('img', {
          cls: 'cassette-user-avatar',
          attr: {
            src: userInfo.picture,
            alt: userInfo.name
          }
        });
      }
      
      // Add username
      userInfoContainer.createEl('span', {
        cls: 'cassette-user-name',
        text: userInfo.name
      });
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
      .setName(isAuth ? 'Clear' : 'Authenticate')
      .setDesc(isAuth 
        ? 'Clear all MyAnimeList credentials and authentication data' 
        : 'Sign in to MyAnimeList to sync your anime list'
      )
      .addButton(button => {
        button
          .setButtonText(isAuth ? 'Clear' : 'Authenticate')
          .setCta()
          .onClick(async () => {
            if (isAuth) {
              await malLogout(this.plugin);
              this.display(); // Refresh settings UI
            } else {
              await startMALAuth(this.plugin);
              this.display();
            }
          });
        
        // Add class for clear button styling
        if (isAuth) {
          button.buttonEl.addClass('cassette-clear-button');
        }
      });

    // Add info about getting credentials
    if (!isAuth) {
      const credentialSetting = new Setting(container)
        .setName('How to get credentials')
        .then(setting => {
          setting.settingEl.addClass('cassette-credential-info');
        });
      
      // Create description with link
      const descEl = credentialSetting.descEl;
      descEl.createSpan({ 
        text: 'Create an app at https://myanimelist.net/apiconfig to get your Client ID and Secret. Set the redirect URI to: obsidian://cassette-auth/mal. See our ' 
      });
      descEl.createEl('a', {
        text: 'guide',
        href: 'https://github.com/zara-kasi/cassette/blob/main/docs/mal-authentication-guide.md'
      }).addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://github.com/zara-kasi/cassette/blob/main/docs/mal-authentication-guide.md', '_blank');
      });
      descEl.createSpan({ text: ' for detailed instructions.' });
    }
  }

  private renderSimklSection(container: HTMLElement): void {
    const isAuth = isSimklAuthenticated(this.plugin);

    // Show user info if authenticated
    if (isAuth && this.plugin.settings.simklUserInfo) {
      const userInfo = this.plugin.settings.simklUserInfo;
      
      const userSetting = new Setting(container);
      
      // Create a container for avatar and name
      const userInfoContainer = userSetting.controlEl.createDiv({ cls: 'cassette-user-info' });
      
      // Add avatar if available
      if (userInfo.picture) {
        userInfoContainer.createEl('img', {
          cls: 'cassette-user-avatar',
          attr: {
            src: userInfo.picture,
            alt: userInfo.name
          }
        });
      }
      
      // Add username
      userInfoContainer.createEl('span', {
        cls: 'cassette-user-name',
        text: userInfo.name
      });
    }

    // Client ID
    new Setting(container)
      .setName('Client ID')
      .setDesc('Your SIMKL Client ID')
      .addText(text => text
        .setPlaceholder('Enter Client ID')
        .setValue(this.plugin.settings.simklClientId)
        .onChange(async (value) => {
          this.plugin.settings.simklClientId = value.trim();
          await this.plugin.saveSettings();
        }));

    // Client Secret
    new Setting(container)
      .setName('Client Secret')
      .setDesc('Your SIMKL Client Secret')
      .addText(text => {
        text
          .setPlaceholder('Enter Client Secret')
          .setValue(this.plugin.settings.simklClientSecret || '')
          .onChange(async (value) => {
            this.plugin.settings.simklClientSecret = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = 'password';
        return text;
      });

    // Authentication button
    new Setting(container)
      .setName(isAuth ? 'Clear' : 'Authenticate')
      .setDesc(isAuth 
        ? 'Clear all SIMKL credentials and authentication data' 
        : 'Sign in to SIMKL to sync your watch list'
      )
      .addButton(button => {
        button
          .setButtonText(isAuth ? 'Clear' : 'Authenticate')
          .setCta()
          .onClick(async () => {
            if (isAuth) {
              await simklLogout(this.plugin);
              this.display(); // Refresh settings UI
            } else {
              await startSimklAuth(this.plugin);
              // UI will refresh automatically after successful auth
            }
          });
        
        // Add class for clear button styling
        if (isAuth) {
          button.buttonEl.addClass('cassette-clear-button');
        }
      });

    // Add info about getting credentials
    if (!isAuth) {
      const credentialSetting = new Setting(container)
        .setName('How to get credentials')
        .then(setting => {
          setting.settingEl.addClass('cassette-credential-info');
        });
      
      // Create description with link
      const descEl = credentialSetting.descEl;
      descEl.createSpan({ 
        text: 'Create an app at https://simkl.com/settings/developer to get your Client ID and Secret. Set the redirect URI to: obsidian://cassette-auth/simkl. ' 
      });
      descEl.createSpan({ 
        text: 'SIMKL uses OAuth 2.0 authentication for secure authorization.' 
      });
    }
  }
}