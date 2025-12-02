import { App, PluginSettingTab, Setting } from 'obsidian';
import CassettePlugin from '../main';
import { startAuthFlow as startMALAuth, logout as malLogout, isAuthenticated as isMALAuthenticated } from '../api/mal';
import { renderPropertyMappingSection } from './property-settings';
import { 
  renderTemplateSection,
  createTemplateSettingsState,
  TemplateSettingsState
} from './template-settings';

export class CassetteSettingTab extends PluginSettingTab {
  plugin: CassettePlugin;
  private templateState: TemplateSettingsState;

  constructor(app: App, plugin: CassettePlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.templateState = createTemplateSettingsState(() => this.display());
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // ========================================================================
    // MAL Section
    // ========================================================================
    
    this.renderMALSection(containerEl);

    // ========================================================================
    // Template Section
    // ========================================================================
    
    renderTemplateSection(containerEl, this.plugin, this.templateState);

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
      
      const userSetting = new Setting(container);
      
      // Create a container for avatar, name, and Logout button
      const userInfoContainer = userSetting.controlEl.createDiv({ cls: 'cassette-user-info-wrapper' });
      
      // Left side: avatar and name
      const userDetailsContainer = userInfoContainer.createDiv({ cls: 'cassette-user-details' });
      
      // Add avatar if available
      if (userInfo.picture) {
        userDetailsContainer.createEl('img', {
          cls: 'cassette-user-avatar',
          attr: {
            src: userInfo.picture,
            alt: userInfo.name
          }
        });
      }
      
      // Add username (clickable link to MAL profile)
      const usernameLink = userDetailsContainer.createEl('a', {
        cls: 'cassette-user-name',
        text: userInfo.name,
        href: `https://myanimelist.net/profile/${userInfo.name}`
      });
      
      // Open link in external browser
      usernameLink.addEventListener('click', (e) => {
        e.preventDefault();
        const profileUrl = `https://myanimelist.net/profile/${userInfo.name}`;
        
        if (window.require) {
          const { shell } = window.require('electron');
          shell.openExternal(profileUrl);
        } else {
          window.open(profileUrl, '_blank');
        }
      });
      
      // Right side: Logout button
      const buttonContainer = userInfoContainer.createDiv({ cls: 'cassette-button-container' });
      
      const logoutButton = buttonContainer.createEl('button', {
        cls: 'cassette-logout-button mod-warning',
        text: 'Log out'
      });
      
      logoutButton.addEventListener('click', async () => {
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
    }
    
    // Authentication button (only shown when not authenticated)
    if (!isAuth) {
      const authSetting = new Setting(container)
        .setName('Authenticate')
        .addButton(button => {
          button
            .setButtonText('Authenticate')
            .setCta()
            .onClick(async () => {
              await startMALAuth(this.plugin);
              this.display();
            });
        });
      
      // Add description with "Learn more" link
      const descEl = authSetting.descEl;
      descEl.createSpan({ 
        text: 'Sign in to MyAnimeList. ' 
      });
      descEl.createEl('a', {
        text: 'Learn more',
        href: 'https://github.com/zara-kasi/cassette/blob/main/docs/mal-authentication-guide.md'
      }).addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://github.com/zara-kasi/cassette/blob/main/docs/mal-authentication-guide.md', '_blank');
      });
    }
  }

  private renderSyncSection(container: HTMLElement): void {
    new Setting(container)
      .setName('Notifications')
      .setDesc('Enable or disable notifications from the plugin.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.notificationsEnabled)
        .onChange(async (value) => {
          this.plugin.settings.notificationsEnabled = value;
          await this.plugin.saveSettings();
        }));
  
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
      .setName('Optimize auto-sync')
      .setDesc('When enabled, auto-sync only syncs Watching anime and Reading manga (Recommended).')
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
