/**
 * Template Editor Modal
 * 
 * Modal for editing anime/manga templates with drag-and-drop property list
 */

import { App, Modal, Setting, setIcon, Menu } from 'obsidian';
import type CassettePlugin from '../main';
import { 
  TemplateConfig, 
  PropertyItem, 
  getAvailableProperties,
  getPropertyMetadata,
  generatePropertyId,
  DEFAULT_ANIME_TEMPLATE,
  DEFAULT_MANGA_TEMPLATE
} from './template-config';
import { FolderSuggest } from './folder-suggest';

export class TemplateModal extends Modal {
  plugin: CassettePlugin;
  templateType: 'anime' | 'manga';
  config: TemplateConfig;
  originalConfig: TemplateConfig;
  propertyListEl: HTMLElement;
  draggedElement: HTMLElement | null = null;
  
  constructor(
    app: App, 
    plugin: CassettePlugin, 
    templateType: 'anime' | 'manga'
  ) {
    super(app);
    this.plugin = plugin;
    this.templateType = templateType;
    
    // Load existing config or use defaults
    if (templateType === 'anime') {
      this.config = plugin.settings.animeTemplate 
        ? JSON.parse(JSON.stringify(plugin.settings.animeTemplate))
        : JSON.parse(JSON.stringify(DEFAULT_ANIME_TEMPLATE));
    } else {
      this.config = plugin.settings.mangaTemplate
        ? JSON.parse(JSON.stringify(plugin.settings.mangaTemplate))
        : JSON.parse(JSON.stringify(DEFAULT_MANGA_TEMPLATE));
    }
    
    // Keep a copy for cancel functionality
    this.originalConfig = JSON.parse(JSON.stringify(this.config));
  }
  
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('cassette-template-modal');
    
    // Title
    contentEl.createEl('h2', { 
      text: `${this.templateType === 'anime' ? 'Anime' : 'Manga'} Template Configuration` 
    });
    
    // Folder path setting
    new Setting(contentEl)
      .setName('Folder Path')
      .setDesc('Where notes will be saved')
      .addText(text => {
        new FolderSuggest(this.app, text.inputEl);
        text
          .setPlaceholder(`Cassette/${this.templateType === 'anime' ? 'Anime' : 'Manga'}`)
          .setValue(this.config.folderPath)
          .onChange(value => {
            this.config.folderPath = value;
          });
      });
    
    // Properties section header
    contentEl.createEl('h3', { text: 'Properties' });
    
    // Properties list container
    this.propertyListEl = contentEl.createDiv({ cls: 'cassette-property-list' });
    this.renderPropertyList();
    
    // Add property button
    const addButtonContainer = contentEl.createDiv({ cls: 'cassette-add-property-container' });
    const addButton = addButtonContainer.createEl('button', { 
      cls: 'cassette-add-property-button',
      text: 'Add Property'
    });
    setIcon(addButton, 'plus');
    
    addButton.addEventListener('click', () => {
      this.showAddPropertyMenu(addButton);
    });
    
    // Footer buttons
    const footerEl = contentEl.createDiv({ cls: 'cassette-modal-footer' });
    
    // Reset button (left side)
    const resetButton = footerEl.createEl('button', { 
      text: 'Reset to Defaults',
      cls: 'mod-warning'
    });
    resetButton.addEventListener('click', () => {
      this.resetToDefaults();
    });
    
    // Right side buttons container
    const rightButtons = footerEl.createDiv({ cls: 'cassette-modal-footer-right' });
    
    // Cancel button
    const cancelButton = rightButtons.createEl('button', { text: 'Cancel' });
    cancelButton.addEventListener('click', () => {
      this.close();
    });
    
    // Save button
    const saveButton = rightButtons.createEl('button', { 
      text: 'Save',
      cls: 'mod-cta'
    });
    saveButton.addEventListener('click', () => {
      this.save();
    });
  }
  
  /**
   * Renders the property list
   */
  renderPropertyList() {
    this.propertyListEl.empty();
    
    // Sort properties by order
    const sortedProps = [...this.config.properties].sort((a, b) => a.order - b.order);
    
    sortedProps.forEach((prop, index) => {
      this.renderPropertyRow(prop, index);
    });
  }
  
  /**
   * Renders a single property row
   */
  renderPropertyRow(prop: PropertyItem, index: number) {
    const rowEl = this.propertyListEl.createDiv({ cls: 'cassette-property-row' });
    rowEl.setAttribute('draggable', 'true');
    rowEl.setAttribute('data-id', prop.id);
    
    // Drag handle
    const dragHandle = rowEl.createDiv({ cls: 'cassette-drag-handle' });
    setIcon(dragHandle, 'grip-vertical');
    
    // Property name input
    const nameInput = rowEl.createEl('input', {
      cls: 'cassette-property-name',
      type: 'text',
      value: prop.customName
    });
    nameInput.addEventListener('input', (e) => {
      prop.customName = (e.target as HTMLInputElement).value;
    });
    
    // Template variable (read-only)
    const templateVar = rowEl.createDiv({ 
      cls: 'cassette-template-var',
      text: `{{${prop.key}}}`
    });
    
    // Delete button
    const deleteButton = rowEl.createDiv({ cls: 'cassette-delete-button' });
    setIcon(deleteButton, 'trash-2');
    deleteButton.addEventListener('click', () => {
      this.removeProperty(prop.id);
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
    
    rowEl.addEventListener('drop', (e) => {
      e.preventDefault();
      rowEl.removeClass('drag-over-top');
      rowEl.removeClass('drag-over-bottom');
      
      if (this.draggedElement && this.draggedElement !== rowEl) {
        this.reorderProperties(
          this.draggedElement.getAttribute('data-id') || '',
          prop.id,
          e.clientY < (rowEl.getBoundingClientRect().top + rowEl.getBoundingClientRect().height / 2)
        );
      }
    });
  }
  
  /**
   * Shows dropdown menu for adding properties
   */
  showAddPropertyMenu(buttonEl: HTMLElement) {
    const menu = this.app.workspace.trigger('cassette:show-property-menu', buttonEl);
    
    // Get available properties (not already added)
    const addedKeys = new Set(this.config.properties.map(p => p.key));
    const availableProps = getAvailableProperties(this.templateType)
      .filter(p => !addedKeys.has(p.key));
    
    if (availableProps.length === 0) {
      // No more properties to add - could show a notice
      return;
    }
    
    // Create a simple menu using Obsidian's Menu API would be ideal,
    // but for now we'll use a custom dropdown
    const dropdown = document.createElement('div');
    dropdown.addClass('cassette-property-dropdown');
    
    availableProps.forEach(metadata => {
      const item = dropdown.createDiv({ cls: 'cassette-dropdown-item' });
      item.createSpan({ text: metadata.label });
      item.createSpan({ 
        cls: 'cassette-dropdown-key',
        text: `{{${metadata.key}}}`
      });
      
      item.addEventListener('click', () => {
        this.addProperty(metadata.key);
        dropdown.remove();
      });
    });
    
    // Position dropdown
    const rect = buttonEl.getBoundingClientRect();
    dropdown.style.position = 'absolute';
    dropdown.style.top = `${rect.bottom + 5}px`;
    dropdown.style.left = `${rect.left}px`;
    
    document.body.appendChild(dropdown);
    
    // Close on click outside
    const closeDropdown = (e: MouseEvent) => {
      if (!dropdown.contains(e.target as Node) && e.target !== buttonEl) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closeDropdown);
    }, 10);
  }
  
  /**
   * Adds a new property
   */
  addProperty(key: string) {
    const metadata = getPropertyMetadata(key);
    if (!metadata) return;
    
    const newProp: PropertyItem = {
      id: generatePropertyId(),
      key: key,
      customName: metadata.defaultName,
      order: this.config.properties.length + 1
    };
    
    this.config.properties.push(newProp);
    this.renderPropertyList();
  }
  
  /**
   * Removes a property
   */
  removeProperty(id: string) {
    this.config.properties = this.config.properties.filter(p => p.id !== id);
    this.reorderPropertiesSequentially();
    this.renderPropertyList();
  }
  
  /**
   * Reorders properties after drag and drop
   */
  reorderProperties(draggedId: string, targetId: string, insertBefore: boolean) {
    const draggedIndex = this.config.properties.findIndex(p => p.id === draggedId);
    const targetIndex = this.config.properties.findIndex(p => p.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const [draggedProp] = this.config.properties.splice(draggedIndex, 1);
    
    const newTargetIndex = this.config.properties.findIndex(p => p.id === targetId);
    const insertIndex = insertBefore ? newTargetIndex : newTargetIndex + 1;
    
    this.config.properties.splice(insertIndex, 0, draggedProp);
    
    this.reorderPropertiesSequentially();
    this.renderPropertyList();
  }
  
  /**
   * Reorders properties sequentially (1, 2, 3, ...)
   */
  reorderPropertiesSequentially() {
    this.config.properties.forEach((prop, index) => {
      prop.order = index + 1;
    });
  }
  
  /**
   * Resets to default template
   */
  resetToDefaults() {
    if (this.templateType === 'anime') {
      this.config = JSON.parse(JSON.stringify(DEFAULT_ANIME_TEMPLATE));
    } else {
      this.config = JSON.parse(JSON.stringify(DEFAULT_MANGA_TEMPLATE));
    }
    
    this.renderPropertyList();
  }
  
  /**
   * Saves the template configuration
   */
  async save() {
    // Save to plugin settings
    if (this.templateType === 'anime') {
      this.plugin.settings.animeTemplate = this.config;
    } else {
      this.plugin.settings.mangaTemplate = this.config;
    }
    
    await this.plugin.saveSettings();
    this.close();
  }
  
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}