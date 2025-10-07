import { App, PluginSettingTab, Setting } from 'obsidian';
import CassettePlugin from '../main';
import { startAuthFlow as startMALAuth, logout as malLogout, isAuthenticated as isMALAuthenticated } from '../auth/mal';
import { startAuthFlow as startSimklAuth, logout as simklLogout, isAuthenticated as isSimklAuthenticated } from '../auth/simkl';
import { DEFAULT_PROPERTY_MAPPING, DEFAULT_PROPERTY_TEMPLATE } from '../sync/storage/property-mapping';

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
    // Storage Section
    // ========================================================================
    
    containerEl.createEl('h2', { text: 'Storage' });
    
    this.renderStorageSection(containerEl);

    // ========================================================================
    // Property Customization Section
    // ========================================================================
    
    containerEl.createEl('h2', { text: 'Property Customization' });
    
    containerEl.createEl('p', {
      text: 'Customize how data is stored in note frontmatter. All synced data is stored as YAML properties only.',
      cls: 'setting-item-description'
    });
    
    this.renderPropertyMappingSection(containerEl);
    this.renderPropertyOrderSection(containerEl);

    // ========================================================================
    // Sync Section
    // ========================================================================
    
    containerEl.createEl('h2', { text: 'Sync' });
    
    this.renderSyncSection(containerEl);

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
        .setDesc('Your MyAnimeList Client Secret (optional)')
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
          .setCta()
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
          .setCta()
          .onClick(async () => {
            if (isAuth) {
              await simklLogout(this.plugin);
              this.display();
            } else {
              await startSimklAuth(this.plugin);
            }
          });
        
        if (isAuth) {
          button.buttonEl.addClass('cassette-clear-button');
        }
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

  private renderPropertyMappingSection(container: HTMLElement): void {
    container.createEl('h3', { text: 'Property Field Names' });
    
    container.createEl('p', { 
      text: 'Customize the property names used in your note frontmatter. Leave blank to use defaults.',
      cls: 'setting-item-description'
    });
    
    // Toggle for custom mapping
    new Setting(container)
      .setName('Use custom property names')
      .setDesc('Enable to customize property field names')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.useCustomPropertyMapping)
        .onChange(async (value) => {
          this.plugin.settings.useCustomPropertyMapping = value;
          await this.plugin.saveSettings();
          this.display();
        }));
    
    if (!this.plugin.settings.useCustomPropertyMapping) {
      return;
    }
    
    // Common fields
    const commonFields = [
      { key: 'id', label: 'ID', default: 'id' },
      { key: 'title', label: 'Title', default: 'title' },
      { key: 'category', label: 'Category', default: 'category' },
      { key: 'platform', label: 'Platform', default: 'platform' },
      { key: 'mainPicture', label: 'Main Picture/Cover', default: 'cover' },
      { key: 'synopsis', label: 'Synopsis', default: 'synopsis' },
      { key: 'mediaType', label: 'Media Type', default: 'type' },
      { key: 'status', label: 'Status', default: 'status' },
      { key: 'mean', label: 'Average Score', default: 'score' },
      { key: 'genres', label: 'Genres', default: 'genres' },
      { key: 'userStatus', label: 'My Status', default: 'my_status' },
      { key: 'userScore', label: 'My Score', default: 'my_score' },
    ];
    
    container.createEl('h4', { text: 'Common Fields' });
    
    commonFields.forEach(field => {
      new Setting(container)
        .setName(field.label)
        .addText(text => text
          .setPlaceholder(field.default)
          .setValue(this.plugin.settings.propertyMapping[field.key as keyof typeof this.plugin.settings.propertyMapping] || '')
          .onChange(async (value) => {
            this.plugin.settings.propertyMapping[field.key as keyof typeof this.plugin.settings.propertyMapping] = 
              value.trim() || field.default;
            await this.plugin.saveSettings();
          }));
    });
    
    // Anime-specific fields
    const animeFields = [
      { key: 'numEpisodes', label: 'Number of Episodes', default: 'episodes' },
      { key: 'numEpisodesWatched', label: 'Episodes Watched', default: 'episodes_watched' },
      { key: 'startSeasonYear', label: 'Season Year', default: 'season_year' },
      { key: 'startSeasonName', label: 'Season Name', default: 'season_name' },
      { key: 'source', label: 'Source Material', default: 'source' },
    ];
    
    container.createEl('h4', { text: 'Anime-Specific Fields' });
    
    animeFields.forEach(field => {
      new Setting(container)
        .setName(field.label)
        .addText(text => text
          .setPlaceholder(field.default)
          .setValue(this.plugin.settings.propertyMapping[field.key as keyof typeof this.plugin.settings.propertyMapping] || '')
          .onChange(async (value) => {
            this.plugin.settings.propertyMapping[field.key as keyof typeof this.plugin.settings.propertyMapping] = 
              value.trim() || field.default;
            await this.plugin.saveSettings();
          }));
    });
    
    // Manga-specific fields
    const mangaFields = [
      { key: 'numVolumes', label: 'Number of Volumes', default: 'volumes' },
      { key: 'numVolumesRead', label: 'Volumes Read', default: 'volumes_read' },
      { key: 'numChapters', label: 'Number of Chapters', default: 'chapters' },
      { key: 'numChaptersRead', label: 'Chapters Read', default: 'chapters_read' },
      { key: 'authors', label: 'Authors', default: 'authors' },
    ];
    
    container.createEl('h4', { text: 'Manga-Specific Fields' });
    
    mangaFields.forEach(field => {
      new Setting(container)
        .setName(field.label)
        .addText(text => text
          .setPlaceholder(field.default)
          .setValue(this.plugin.settings.propertyMapping[field.key as keyof typeof this.plugin.settings.propertyMapping] || '')
          .onChange(async (value) => {
            this.plugin.settings.propertyMapping[field.key as keyof typeof this.plugin.settings.propertyMapping] = 
              value.trim() || field.default;
            await this.plugin.saveSettings();
          }));
    });
    
    // Reset button
    new Setting(container)
      .setName('Reset to defaults')
      .setDesc('Reset all property names to their default values')
      .addButton(button => button
        .setButtonText('Reset')
        .setWarning()
        .onClick(async () => {
          this.plugin.settings.propertyMapping = { ...DEFAULT_PROPERTY_MAPPING };
          await this.plugin.saveSettings();
          this.display();
        }));
  }

  private renderPropertyOrderSection(container: HTMLElement): void {
    container.createEl('h3', { text: 'Property Order' });
    
    container.createEl('p', { 
      text: 'Define the order in which properties appear in your notes. One property key per line.',
      cls: 'setting-item-description'
    });
    
    // Anime template
    new Setting(container)
      .setName('Anime property order')
      .setDesc('Order of properties for anime notes (one per line)')
      .addTextArea(text => {
        text
          .setPlaceholder(DEFAULT_PROPERTY_TEMPLATE.anime.join('\n'))
          .setValue(this.plugin.settings.propertyTemplate.anime.join('\n'))
          .onChange(async (value) => {
            this.plugin.settings.propertyTemplate.anime = value
              .split('\n')
              .map(line => line.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 15;
        text.inputEl.cols = 30;
      });
    
    // Manga template
    new Setting(container)
      .setName('Manga property order')
      .setDesc('Order of properties for manga notes (one per line)')
      .addTextArea(text => {
        text
          .setPlaceholder(DEFAULT_PROPERTY_TEMPLATE.manga.join('\n'))
          .setValue(this.plugin.settings.propertyTemplate.manga.join('\n'))
          .onChange(async (value) => {
            this.plugin.settings.propertyTemplate.manga = value
              .split('\n')
              .map(line => line.trim())
              .filter(Boolean);
            await this.plugin.saveSettings();
          });
        text.inputEl.rows = 15;
        text.inputEl.cols = 30;
      });
    
    // Reset button
    new Setting(container)
      .setName('Reset to defaults')
      .setDesc('Reset property order to default templates')
      .addButton(button => button
        .setButtonText('Reset')
        .setWarning()
        .onClick(async () => {
          this.plugin.settings.propertyTemplate = { ...DEFAULT_PROPERTY_TEMPLATE };
          await this.plugin.saveSettings();
          this.display();
        }));
    
    // Available properties reference
    const availableProps = container.createEl('details');
    availableProps.createEl('summary', { text: 'Available property keys (click to expand)' });
    
    const propsDiv = availableProps.createDiv({ cls: 'cassette-available-props' });
    propsDiv.createEl('p', { text: 'Common:' });
    propsDiv.createEl('pre', { 
      text: [
        'id', 'title', 'category', 'platform',
        'mainPicture', 'pictures',
        'alternativeTitlesEn', 'alternativeTitlesJa', 'alternativeTitlesSynonyms',
        'synopsis', 'mediaType', 'status', 'mean', 'genres',
        'userStatus', 'userScore', 'lastSynced'
      ].join('\n')
    });
    
    propsDiv.createEl('p', { text: 'Anime-specific:' });
    propsDiv.createEl('pre', { 
      text: [
        'numEpisodes', 'numEpisodesWatched',
        'startSeasonYear', 'startSeasonName', 'source'
      ].join('\n')
    });
    
    propsDiv.createEl('p', { text: 'Manga-specific:' });
    propsDiv.createEl('pre', { 
      text: [
        'numVolumes', 'numVolumesRead',
        'numChapters', 'numChaptersRead', 'authors'
      ].join('\n')
    });
  }

  private renderSyncSection(container: HTMLElement): void {
    new Setting(container)
      .setName('Auto-sync')
      .setDesc('Automatically sync your lists at regular intervals')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoSync)
        .onChange(async (value) => {
          this.plugin.settings.autoSync = value;
          await this.plugin.saveSettings();
        }));

    new Setting(container)
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
  }
}