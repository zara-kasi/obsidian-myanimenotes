import { App, PluginSettingTab, Setting, ButtonComponent } from 'obsidian';
import { normalizePath } from 'obsidian';
import CassettePlugin from '../main';
import { startAuthFlow as startMALAuth, logout as malLogout, isAuthenticated as isMALAuthenticated } from '../api/mal';
import { DEFAULT_PROPERTY_MAPPING } from '../storage/markdown';
import { renderPropertyMappingSection } from './property-settings';
import { FolderSuggest } from './folder-suggest';

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
    
    this.renderMALSection(containerEl);

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
    .setDesc('Enable detailed console logging.')
    .addToggle(toggle => toggle
      .setValue(this.plugin.settings.debugMode)
      .onChange(async (value) => {
        this.plugin.settings.debugMode = value;
        await this.plugin.saveSettings();
        
      }));

  }

  private renderMALSection(container: HTMLElement): void {
    const isAuth = isMALAuthenticated(this.plugin);

    // Show user info if authenticated
    if (isAuth && this.plugin.settings.malUserInfo) {
  const userInfo = this.plugin.settings.malUserInfo;
  
  const userSetting = new Setting(container)
    .setName('MyAnimeList Account');
  
  // Create a container for avatar, name, and remove button
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

  // Add remove button
  userInfoContainer
    .createEl('button', {
      cls: 'cassette-remove-auth-btn',
      text: '×'
    })
    .addEventListener('click', async () => {
      await malLogout(this.plugin);
      this.display();
    });
}
    
    // Only show Client ID and Secret when not authenticated
    if (!isAuth) {
      // Client ID
      new Setting(container)
        .setName('Client ID')
        .setDesc('Your MyAnimeList Client ID.')
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
        .setDesc('Your MyAnimeList Client Secret.')
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
        .setName('Authenticate')
        .setDesc('Sign in to MyAnimeList to sync your anime list.')
        .addButton(button => {
          button
            .setButtonText('Authenticate')
            .setCta()
            .onClick(async () => {
              await startMALAuth(this.plugin);
              this.display();
            });
        });

      // Add info about getting credentials
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
      descEl.createEl('code', { text: 'obsidian://cassette-auth/mal.' });
      descEl.createEl('a', {
        text: 'Learn more',
        href: 'https://github.com/zara-kasi/cassette/blob/main/docs/mal-authentication-guide.md'
      }).addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://github.com/zara-kasi/cassette/blob/main/docs/mal-authentication-guide.md', '_blank');
      });
    }
  }

  private renderStorageSection(container: HTMLElement): void {
    new Setting(container)
      .setName('Anime folder')
      .setDesc('Folder where anime notes will be saved.')
      .addText(text => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setPlaceholder('Cassette/Anime')
          .setValue(this.plugin.settings.animeFolder)
          .onChange(async (value) => {
            // Normalize the path to handle cross-platform paths and user input variations
            const normalizedPath = normalizePath(value.trim() || 'Cassette/Anime');
            this.plugin.settings.animeFolder = normalizedPath;
            await this.plugin.saveSettings();
          });
      });

    new Setting(container)
      .setName('Manga folder')
      .setDesc('Folder where manga notes will be saved.')
      .addText(text => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setPlaceholder('Cassette/Manga')
          .setValue(this.plugin.settings.mangaFolder)
          .onChange(async (value) => {
            // Normalize the path to handle cross-platform paths and user input variations
            const normalizedPath = normalizePath(value.trim() || 'Cassette/Manga');
            this.plugin.settings.mangaFolder = normalizedPath;
            await this.plugin.saveSettings();
          });
      });
  }

  private renderSyncSection(container: HTMLElement): void {
  
  // Scheduled sync toggle
  new Setting(container)
    .setName('Scheduled sync')
    .setDesc('Automatically sync at regular intervals.')
    .addToggle(toggle => toggle
      .setValue(this.plugin.settings.scheduledSync)
      .onChange(async (value) => {
        this.plugin.settings.scheduledSync = value;
        await this.plugin.saveSettings();
        
        // Restart auto-sync manager to apply changes
        if (this.plugin.autoSyncManager) {
          this.plugin.autoSyncManager.stop();
          this.plugin.autoSyncManager.start();
        }
        
        // Refresh UI to show/hide interval input
        this.display();
      }));
  
  // Scheduled sync interval (only show if scheduled sync is enabled)
  if (this.plugin.settings.scheduledSync) {
    new Setting(container)
      .setName('Sync interval')
      .setDesc('Time between automatic syncs in minutes (minimum 60).')
      .addText(text => text
        .setPlaceholder('60')
        .setValue(String(this.plugin.settings.scheduledSyncInterval))
        .onChange(async (value) => {
          const numValue = parseInt(value);
          if (!isNaN(numValue) && numValue >= 60) {
            this.plugin.settings.scheduledSyncInterval = numValue;
            await this.plugin.saveSettings();
            
            // Restart auto-sync manager to apply new interval
            if (this.plugin.autoSyncManager) {
              this.plugin.autoSyncManager.stop();
              this.plugin.autoSyncManager.start();
            }
          }
        }));
  }
  
   // Sync on load toggle
  new Setting(container)
    .setName('Sync after startup')
    .setDesc('Automatically sync shortly after Obsidian starts.')
    .addToggle(toggle => toggle
      .setValue(this.plugin.settings.syncOnLoad)
      .onChange(async (value) => {
        this.plugin.settings.syncOnLoad = value;
        await this.plugin.saveSettings();
        
        // Restart auto-sync manager to apply changes
        if (this.plugin.autoSyncManager) {
          this.plugin.autoSyncManager.stop();
          this.plugin.autoSyncManager.start();
        }
      }));
      
  // Optimize auto sync toggle
  new Setting(container)
    .setName('Optimize auto sync')
    .setDesc('When enabled, auto-sync only syncs Watching anime and Reading manga.')
    .addToggle(toggle => toggle
      .setValue(this.plugin.settings.optimizeAutoSync)
      .onChange(async (value) => {
        this.plugin.settings.optimizeAutoSync = value;
        await this.plugin.saveSettings();
      }));
  
   // Force full sync toggle
  new Setting(container)
    .setName('Overwrite all')
    .setDesc('Update all notes on every sync, even if nothing changed.')
    .addToggle(toggle => toggle
      .setValue(this.plugin.settings.forceFullSync)
      .onChange(async (value) => {
        this.plugin.settings.forceFullSync = value;
        await this.plugin.saveSettings();
      }));
  
}
}