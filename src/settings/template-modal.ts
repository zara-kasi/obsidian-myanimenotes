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
  propertyListEl!: HTMLElement;
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
    
    // Properties list container (no border, just a container)
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
      this.addEmptyProperty();
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
      value: prop.customName,
      attr: {
        placeholder: 'Property name'
      }
    });
    nameInput.addEventListener('input', (e) => {
      prop.customName = (e.target as HTMLInputElement).value;
    });
    
    // Template variable input (editable)
    const templateInput = rowEl.createEl('input', {
      cls: 'cassette-template-var',
      type: 'text',
      value: prop.key,
      attr: {
        placeholder: 'Template variable'
      }
    });
    templateInput.addEventListener('input', (e) => {
      prop.key = (e.target as HTMLInputElement).value;
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
   * Adds an empty property row
   */
  addEmptyProperty() {
    const newProp: PropertyItem = {
      id: generatePropertyId(),
      key: '',
      customName: '',
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
   * Auto-save when modal closes
   */
  async autoSave() {
    // Save to plugin settings
    if (this.templateType === 'anime') {
      this.plugin.settings.animeTemplate = this.config;
    } else {
      this.plugin.settings.mangaTemplate = this.config;
    }
    
    await this.plugin.saveSettings();
  }
  
  onClose() {
    const { contentEl } = this;
    
    // Auto-save before closing
    this.autoSave();
    
    contentEl.empty();
  }
}