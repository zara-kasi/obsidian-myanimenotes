import { App, PluginSettingTab, Setting, setIcon } from 'obsidian';
import { normalizePath } from 'obsidian';
import CassettePlugin from '../main';
import { startAuthFlow as startMALAuth, logout as malLogout, isAuthenticated as isMALAuthenticated } from '../api/mal';
import { DEFAULT_PROPERTY_MAPPING } from '../storage/markdown';
import { renderPropertyMappingSection } from './property-settings';
import { FolderSuggest } from './folder-suggest';
import { 
  TemplateConfig, 
  PropertyItem, 
  getAvailableProperties,
  getPropertyMetadata,
  generatePropertyId,
  DEFAULT_ANIME_TEMPLATE,
  DEFAULT_MANGA_TEMPLATE
} from './template-config';

export class CassetteSettingTab extends PluginSettingTab {
  plugin: CassettePlugin;
  private animeTemplateExpanded: boolean = false;
  private mangaTemplateExpanded: boolean = false;
  private animePropertyListEl: HTMLElement | null = null;
  private mangaPropertyListEl: HTMLElement | null = null;
  private draggedElement: HTMLElement | null = null;

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
    // Template Section (NEW - Inline expandable)
    // ========================================================================
    
    this.renderTemplateSection(containerEl);

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
  
  private renderTemplateSection(container: HTMLElement): void {
    
    // Anime template expandable section
    this.renderExpandableTemplate(container, 'anime');
    
    // Manga template expandable section
    this.renderExpandableTemplate(container, 'manga');
  }

  private renderExpandableTemplate(container: HTMLElement, type: 'anime' | 'manga'): void {
    const isExpanded = type === 'anime' ? this.animeTemplateExpanded : this.mangaTemplateExpanded;
    const config = this.getTemplateConfig(type);
    
    // Main setting with toggle
    const setting = new Setting(container)
      .setName(`${type === 'anime' ? 'Anime' : 'Manga'} Template`)
      .setDesc(`Configure how ${type} notes are created and which properties to include.`)
      .setClass('cassette-template-setting');
    
    // Add collapse/expand icon
    const iconEl = setting.nameEl.createDiv({ cls: 'cassette-collapse-icon' });
    setIcon(iconEl, isExpanded ? 'chevron-down' : 'chevron-right');
    
    // Make the entire setting clickable to toggle
    setting.settingEl.addClass('cassette-clickable-setting');
    setting.settingEl.addEventListener('click', (e) => {
      // Don't toggle if clicking on input fields or buttons inside the expanded content
      if ((e.target as HTMLElement).closest('.cassette-template-content')) {
        return;
      }
      
      if (type === 'anime') {
        this.animeTemplateExpanded = !this.animeTemplateExpanded;
      } else {
        this.mangaTemplateExpanded = !this.mangaTemplateExpanded;
      }
      this.display();
    });
    
    // Expanded content container
    if (isExpanded) {
      const contentContainer = container.createDiv({ cls: 'cassette-template-content' });
      
      // Folder path setting
      new Setting(contentContainer)
        .setName('Folder Path')
        .setDesc('Where notes will be saved')
        .addText(text => {
          new FolderSuggest(this.app, text.inputEl);
          text
            .setPlaceholder(`Cassette/${type === 'anime' ? 'Anime' : 'Manga'}`)
            .setValue(config.folderPath)
            .onChange(async (value) => {
              config.folderPath = value;
              await this.saveTemplateConfig(type, config);
            });
        });
      
      // Properties section header
      contentContainer.createEl('h4', { text: 'Properties' });
      
      // Properties list container
      const propertyListEl = contentContainer.createDiv({ cls: 'cassette-property-list' });
      
      // Store reference for drag operations
      if (type === 'anime') {
        this.animePropertyListEl = propertyListEl;
      } else {
        this.mangaPropertyListEl = propertyListEl;
      }
      
      this.renderPropertyList(propertyListEl, config, type);
      
     // Add property button
     const addButtonContainer = contentContainer.createDiv({ cls: 'cassette-add-property-container' });
     const addButton = addButtonContainer.createEl('button', { 
  cls: 'cassette-add-property-button'
});

     // Create icon element inside the button
     const iconEl = addButton.createSpan({ cls: 'cassette-button-icon' });
      setIcon(iconEl, 'plus');

      // Add text after the icon
     addButton.createSpan({ 
  cls: 'cassette-button-text',
  text: 'Add Property' 
});

    addButton.addEventListener('click', () => {
  this.addEmptyProperty(config, type);
});
      
    }
  }

  private renderPropertyList(container: HTMLElement, config: TemplateConfig, type: 'anime' | 'manga'): void {
    container.empty();
    
    // Sort properties by order
    const sortedProps = [...config.properties].sort((a, b) => a.order - b.order);
    
    sortedProps.forEach((prop) => {
      this.renderPropertyRow(container, prop, config, type);
    });
  }

  private renderPropertyRow(
    container: HTMLElement, 
    prop: PropertyItem, 
    config: TemplateConfig, 
    type: 'anime' | 'manga'
  ): void {
    const rowEl = container.createDiv({ cls: 'cassette-property-row' });
    rowEl.setAttribute('draggable', 'true');
    rowEl.setAttribute('data-id', prop.id);
    
    // Drag handle
    const dragHandle = rowEl.createDiv({ cls: 'cassette-drag-handle' });
    setIcon(dragHandle, 'grip-vertical');
    
    // Property name input
    const nameInput = rowEl.createEl('input', {
      cls: 'cassette-property-name',
      type: 'text',
      value: prop.customName,
      attr: {
        placeholder: 'Property name'
      }
    });
    nameInput.addEventListener('input', async (e) => {
      prop.customName = (e.target as HTMLInputElement).value;
      await this.saveTemplateConfig(type, config);
    });
    
    // Template variable input (editable)
    const templateInput = rowEl.createEl('input', {
      cls: 'cassette-template-var',
      type: 'text',
      value: prop.key ? `{{${prop.key}}}` : '',
      attr: {
        placeholder: '{{Property value}}'
      }
    });
    
    // Store the raw value without brackets
    templateInput.addEventListener('blur', async (e) => {
      const value = (e.target as HTMLInputElement).value;
      // Remove brackets and store clean key
      prop.key = value.replace(/^\{\{|\}\}$/g, '').trim();
      // Update display with brackets
      (e.target as HTMLInputElement).value = prop.key ? `{{${prop.key}}}` : '';
      await this.saveTemplateConfig(type, config);
    });
    
    templateInput.addEventListener('input', (e) => {
      // Just store the current value as-is while typing
      const value = (e.target as HTMLInputElement).value;
      // Remove brackets for storage
      prop.key = value.replace(/^\{\{|\}\}$/g, '').trim();
    });
    
    // Delete button
    const deleteButton = rowEl.createDiv({ cls: 'cassette-delete-button' });
    setIcon(deleteButton, 'trash-2');
    deleteButton.addEventListener('click', async () => {
      await this.removeProperty(prop.id, config, type);
    });
    
    // Drag events
    rowEl.addEventListener('dragstart', (e) => {
      this.draggedElement = rowEl;
      rowEl.addClass('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
      }
    });
    
    rowEl.addEventListener('dragend', () => {
      rowEl.removeClass('dragging');
      this.draggedElement = null;
    });
    
    rowEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.draggedElement && this.draggedElement !== rowEl) {
        const rect = rowEl.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        
        if (e.clientY < midpoint) {
          rowEl.addClass('drag-over-top');
          rowEl.removeClass('drag-over-bottom');
        } else {
          rowEl.addClass('drag-over-bottom');
          rowEl.removeClass('drag-over-top');
        }
      }
    });
    
    rowEl.addEventListener('dragleave', () => {
      rowEl.removeClass('drag-over-top');
      rowEl.removeClass('drag-over-bottom');
    });
    
    rowEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      rowEl.removeClass('drag-over-top');
      rowEl.removeClass('drag-over-bottom');
      
      if (this.draggedElement && this.draggedElement !== rowEl) {
        await this.reorderProperties(
          this.draggedElement.getAttribute('data-id') || '',
          prop.id,
          e.clientY < (rowEl.getBoundingClientRect().top + rowEl.getBoundingClientRect().height / 2),
          config,
          type
        );
      }
    });
  }

  private addEmptyProperty(config: TemplateConfig, type: 'anime' | 'manga'): void {
    const newProp: PropertyItem = {
      id: generatePropertyId(),
      key: '',
      customName: '',
      order: config.properties.length + 1
    };
    
    config.properties.push(newProp);
    this.saveTemplateConfig(type, config);
    
    // Re-render just the property list
    const listEl = type === 'anime' ? this.animePropertyListEl : this.mangaPropertyListEl;
    if (listEl) {
      this.renderPropertyList(listEl, config, type);
    }
  }

  private async removeProperty(id: string, config: TemplateConfig, type: 'anime' | 'manga'): Promise<void> {
    config.properties = config.properties.filter(p => p.id !== id);
    this.reorderPropertiesSequentially(config);
    await this.saveTemplateConfig(type, config);
    
    // Re-render just the property list
    const listEl = type === 'anime' ? this.animePropertyListEl : this.mangaPropertyListEl;
    if (listEl) {
      this.renderPropertyList(listEl, config, type);
    }
  }

  private async reorderProperties(
    draggedId: string, 
    targetId: string, 
    insertBefore: boolean,
    config: TemplateConfig,
    type: 'anime' | 'manga'
  ): Promise<void> {
    const draggedIndex = config.properties.findIndex(p => p.id === draggedId);
    const targetIndex = config.properties.findIndex(p => p.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const [draggedProp] = config.properties.splice(draggedIndex, 1);
    
    const newTargetIndex = config.properties.findIndex(p => p.id === targetId);
    const insertIndex = insertBefore ? newTargetIndex : newTargetIndex + 1;
    
    config.properties.splice(insertIndex, 0, draggedProp);
    
    this.reorderPropertiesSequentially(config);
    await this.saveTemplateConfig(type, config);
    
    // Re-render just the property list
    const listEl = type === 'anime' ? this.animePropertyListEl : this.mangaPropertyListEl;
    if (listEl) {
      this.renderPropertyList(listEl, config, type);
    }
  }

  private reorderPropertiesSequentially(config: TemplateConfig): void {
    config.properties.forEach((prop, index) => {
      prop.order = index + 1;
    });
  }

  private getTemplateConfig(type: 'anime' | 'manga'): TemplateConfig {
    if (type === 'anime') {
      return this.plugin.settings.animeTemplate 
        ? JSON.parse(JSON.stringify(this.plugin.settings.animeTemplate))
        : JSON.parse(JSON.stringify(DEFAULT_ANIME_TEMPLATE));
    } else {
      return this.plugin.settings.mangaTemplate
        ? JSON.parse(JSON.stringify(this.plugin.settings.mangaTemplate))
        : JSON.parse(JSON.stringify(DEFAULT_MANGA_TEMPLATE));
    }
  }

  private async saveTemplateConfig(type: 'anime' | 'manga', config: TemplateConfig): Promise<void> {
    if (type === 'anime') {
      this.plugin.settings.animeTemplate = config;
    } else {
      this.plugin.settings.mangaTemplate = config;
    }
    
    await this.plugin.saveSettings();
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