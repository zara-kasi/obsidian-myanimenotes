import { App, PluginSettingTab, Setting } from 'obsidian';
import CassettePlugin from '../main';
import { startAuthFlow as startMALAuth, logout as malLogout, isAuthenticated as isMALAuthenticated } from '../api/mal';
import { startAuthFlow as startSimklAuth, logout as simklLogout, isAuthenticated as isSimklAuthenticated } from '../api/simkl';
import { DEFAULT_PROPERTY_MAPPING } from '../storage/markdown';
import { renderPropertyMappingSection } from './property-settings';

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
    new Setting(containerEl)
  .setName('MyAnimeList')
  .setHeading();
    
    this.renderMALSection(containerEl);

    // ========================================================================
    // SIMKL Section
    // ========================================================================
    new Setting(containerEl)
  .setName('SIMKL')
  .setHeading();
    
    this.renderSimklSection(containerEl);

    // ========================================================================
    // Storage Section
    // ========================================================================
    
    this.renderStorageSection(containerEl);

    // ========================================================================
    // Property Customization Section
    // ========================================================================
    
    renderPropertyMappingSection(containerEl, this.plugin);

    // ========================================================================
    // Sync Section
    // ========================================================================
    
    this.renderSyncSection(containerEl);
   
   // ========================================================================
  // Debug Section
  // ========================================================================
  
   
    new Setting(containerEl)
    .setName('Debug mode')
    .setDesc('Enable detailed console logging for troubleshooting.')
    .addToggle(toggle => toggle
      .setValue(this.plugin.settings.debugMode)
      .onChange(async (value) => {
        this.plugin.settings.debugMode = value;
        await this.plugin.saveSettings();
        
      }));


    // ========================================================================
    // Footer
    // ========================================================================

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
    
    // Only show Client ID and Secret when not authenticated
    if (!isAuth) {
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

      // Client Secret
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
    }
    
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
    .onClick(async () => {
      if (isAuth) {
        await malLogout(this.plugin);
        this.display();
      } else {
        await startMALAuth(this.plugin);
        this.display();
      }
    });

  if (isAuth) {
    // Use native red warning tone
    button.buttonEl.addClass('mod-warning');
  } else {
    // Default authenticate button: blue accent
    button.setCta();
  }
});

    // Add info about getting credentials
    if (!isAuth) {
      const credentialSetting = new Setting(container)
        .setName('How to get credentials')
        .then(setting => {
          setting.settingEl.addClass('cassette-credential-info');
        });
      
      const descEl = credentialSetting.descEl;
      descEl.createSpan({ 
        text: 'Create an app at ' 
      });
      descEl.createEl('code', { text: 'https://myanimelist.net/apiconfig/create' });
      descEl.createSpan({ text: ' to get your Client ID and Secret. Set the redirect URI to: ' });
      descEl.createEl('code', { text: 'obsidian://cassette-auth/mal' });
      descEl.createSpan({ text: '. See our ' });
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
      
      const userInfoContainer = userSetting.controlEl.createDiv({ cls: 'cassette-user-info' });
      
      if (userInfo.picture) {
        userInfoContainer.createEl('img', {
          cls: 'cassette-user-avatar',
          attr: {
            src: userInfo.picture,
            alt: userInfo.name
          }
        });
      }
      
      userInfoContainer.createEl('span', {
        cls: 'cassette-user-name',
        text: userInfo.name
      });
    }

    if (!isAuth) {
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
    }
    
    new Setting(container)
      .setName(isAuth ? 'Clear' : 'Authenticate')
      .setDesc(isAuth 
        ? 'Clear all SIMKL credentials and authentication data' 
        : 'Sign in to SIMKL to sync your watch list'
      )
      .addButton(button => {
  button
    .setButtonText(isAuth ? 'Clear' : 'Authenticate')
    .onClick(async () => {
      if (isAuth) {
        await simklLogout(this.plugin);
        this.display();
      } else {
        await startSimklAuth(this.plugin);
        this.display();
      }
    });

  button.buttonEl.addClass(isAuth ? 'mod-warning' : 'mod-cta');
});

    if (!isAuth) {
      const credentialSetting = new Setting(container)
        .setName('How to get credentials')
        .then(setting => {
          setting.settingEl.addClass('cassette-credential-info');
        });
      
      const descEl = credentialSetting.descEl;
      descEl.createSpan({ 
        text: 'Create an app at ' 
      });
      descEl.createEl('code', { text: 'https://simkl.com/settings/developer/new' });
      descEl.createSpan({ text: ' to get your Client ID and Secret. Set the redirect URI to: ' });
      descEl.createEl('code', { text: 'obsidian://cassette-auth/simkl' });
      descEl.createSpan({ text: '. See our ' });
      descEl.createEl('a', {
        text: 'guide',
        href: 'https://github.com/zara-kasi/cassette/blob/main/docs/simkl-authentication-guide.md'
      }).addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://github.com/zara-kasi/cassette/blob/main/docs/simkl-authentication-guide.md', '_blank');
      });
      descEl.createSpan({ text: ' for detailed instructions.' });
    }
  }

  private renderStorageSection(container: HTMLElement): void {
    new Setting(container)
      .setName('Anime folder')
      .setDesc('Folder where anime notes will be saved')
      .addText(text => text
        .setPlaceholder('Cassette/Anime')
        .setValue(this.plugin.settings.animeFolder)
        .onChange(async (value) => {
          this.plugin.settings.animeFolder = value.trim() || 'Cassette/Anime';
          await this.plugin.saveSettings();
        }));

    new Setting(container)
      .setName('Manga folder')
      .setDesc('Folder where manga notes will be saved')
      .addText(text => text
        .setPlaceholder('Cassette/Manga')
        .setValue(this.plugin.settings.mangaFolder)
        .onChange(async (value) => {
          this.plugin.settings.mangaFolder = value.trim() || 'Cassette/Manga';
          await this.plugin.saveSettings();
        }));
  }

private renderSyncSection(container: HTMLElement): void {
    let syncIntervalSetting: Setting;
    
    new Setting(container)
      .setName('Auto sync')
      .setDesc('Automatically sync your lists at regular intervals')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSync)
        .onChange(async (value) => {
          this.plugin.settings.autoSync = value;
          await this.plugin.saveSettings();
          
          // Show/hide the sync interval setting
          if (syncIntervalSetting) {
            syncIntervalSetting.settingEl.style.display = value ? '' : 'none';
          }
        }));

    syncIntervalSetting = new Setting(container)
      .setName('Sync interval')
      .setDesc('How often to sync automatically (in minutes)')
      .addText(text => text
        .setPlaceholder('60')
        .setValue(String(this.plugin.settings.syncInterval))
        .onChange(async (value) => {
          const interval = parseInt(value);
          if (!isNaN(interval) && interval > 0) {
            this.plugin.settings.syncInterval = interval;
            await this.plugin.saveSettings();
          }
        }));
    
    // Set initial visibility based on auto-sync setting
    syncIntervalSetting.settingEl.style.display = this.plugin.settings.autoSync ? '' : 'none';
        
    new Setting(container)
      .setName('Full overwrite')
      .setDesc('Make sync update every single file. Normally, sync only updates files that changed - enable this to update everything.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.forceFullSync)
        .onChange(async (value) => {
          this.plugin.settings.forceFullSync = value;
          await this.plugin.saveSettings();
        }));
  }
}