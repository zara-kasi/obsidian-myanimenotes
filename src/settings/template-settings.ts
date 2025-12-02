import { Setting, setIcon, normalizePath } from 'obsidian';
import type CassettePlugin from '../main';
import { FolderSuggest } from './folder-suggest';
import { 
  TemplateConfig, 
  PropertyItem, 
  generatePropertyId,
  DEFAULT_ANIME_TEMPLATE,
  DEFAULT_MANGA_TEMPLATE
} from './template-config';

/**
 * Renders the template configuration section
 */
export function renderTemplateSection(
  container: HTMLElement,
  plugin: CassettePlugin,
  templateState: TemplateSettingsState
): void {
  // Anime template expandable section
  renderExpandableTemplate(container, plugin, templateState, 'anime');
  
  // Manga template expandable section
  renderExpandableTemplate(container, plugin, templateState, 'manga');
}

/**
 * State management for template settings
 */
export interface TemplateSettingsState {
  animeTemplateExpanded: boolean;
  mangaTemplateExpanded: boolean;
  animePropertyListEl: HTMLElement | null;
  mangaPropertyListEl: HTMLElement | null;
  draggedElement: HTMLElement | null;
  refreshCallback: () => void;
}

/**
 * Creates initial template settings state
 */
export function createTemplateSettingsState(refreshCallback: () => void): TemplateSettingsState {
  return {
    animeTemplateExpanded: false,
    mangaTemplateExpanded: false,
    animePropertyListEl: null,
    mangaPropertyListEl: null,
    draggedElement: null,
    refreshCallback
  };
}

/**
 * Renders an expandable template section for anime or manga
 */
function renderExpandableTemplate(
  container: HTMLElement,
  plugin: CassettePlugin,
  state: TemplateSettingsState,
  type: 'anime' | 'manga'
): void {
  const isExpanded = type === 'anime' ? state.animeTemplateExpanded : state.mangaTemplateExpanded;
  const config = getTemplateConfig(plugin, type);
  
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
      state.animeTemplateExpanded = !state.animeTemplateExpanded;
    } else {
      state.mangaTemplateExpanded = !state.mangaTemplateExpanded;
    }
    state.refreshCallback();
  });
  
  // Expanded content container
  if (isExpanded) {
    const contentContainer = container.createDiv({ cls: 'cassette-template-content' });
    
    // Folder path setting (using same logic as main folder settings)
    new Setting(contentContainer)
      .setName('Folder Path')
      .setDesc('Where notes will be saved')
      .addText(text => {
        new FolderSuggest(plugin.app, text.inputEl);
        text
          .setPlaceholder(`Cassette/${type === 'anime' ? 'Anime' : 'Manga'}`)
          .setValue(config.folderPath)
          .onChange(async (value) => {
            // Normalize the path to handle cross-platform paths and user input variations
            const normalizedPath = normalizePath(value.trim() || `Cassette/${type === 'anime' ? 'Anime' : 'Manga'}`);
            config.folderPath = normalizedPath;
            await saveTemplateConfig(plugin, type, config);
            
            // Also update the corresponding main folder setting
            if (type === 'anime') {
              plugin.settings.animeFolder = normalizedPath;
            } else {
              plugin.settings.mangaFolder = normalizedPath;
            }
            await plugin.saveSettings();
          });
      });
    
    // Properties section header
    contentContainer.createEl('h4', { text: 'Properties' });
    
    // Properties list container
    const propertyListEl = contentContainer.createDiv({ cls: 'cassette-property-list' });
    
    // Store reference for drag operations
    if (type === 'anime') {
      state.animePropertyListEl = propertyListEl;
    } else {
      state.mangaPropertyListEl = propertyListEl;
    }
    
    renderPropertyList(propertyListEl, plugin, state, config, type);
    
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
      addEmptyProperty(plugin, state, config, type);
    });
  }
}

/**
 * Renders the list of properties
 */
function renderPropertyList(
  container: HTMLElement,
  plugin: CassettePlugin,
  state: TemplateSettingsState,
  config: TemplateConfig,
  type: 'anime' | 'manga'
): void {
  container.empty();
  
  // Sort properties by order
  const sortedProps = [...config.properties].sort((a, b) => a.order - b.order);
  
  sortedProps.forEach((prop) => {
    renderPropertyRow(container, plugin, state, prop, config, type);
  });
}

/**
 * Renders a single property row
 */
function renderPropertyRow(
  container: HTMLElement,
  plugin: CassettePlugin,
  state: TemplateSettingsState,
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
    await saveTemplateConfig(plugin, type, config);
  });
  
  // Template variable input (editable)
  const templateInput = rowEl.createEl('input', {
    cls: 'cassette-template-var',
    type: 'text',
    value: prop.key ? `{{${prop.key}}}` : '',
    attr: {
      placeholder: 'Property value'
    }
  });
  
  // Store the raw value without brackets
  templateInput.addEventListener('blur', async (e) => {
    const value = (e.target as HTMLInputElement).value;
    // Remove brackets and store clean key
    prop.key = value.replace(/^\{\{|\}\}$/g, '').trim();
    // Update display with brackets
    (e.target as HTMLInputElement).value = prop.key ? `{{${prop.key}}}` : '';
    await saveTemplateConfig(plugin, type, config);
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
    await removeProperty(plugin, state, prop.id, config, type);
  });
  
  // Drag events
  rowEl.addEventListener('dragstart', (e) => {
    state.draggedElement = rowEl;
    rowEl.addClass('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  });
  
  rowEl.addEventListener('dragend', () => {
    rowEl.removeClass('dragging');
    state.draggedElement = null;
  });
  
  rowEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (state.draggedElement && state.draggedElement !== rowEl) {
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
    
    if (state.draggedElement && state.draggedElement !== rowEl) {
      await reorderProperties(
        plugin,
        state,
        state.draggedElement.getAttribute('data-id') || '',
        prop.id,
        e.clientY < (rowEl.getBoundingClientRect().top + rowEl.getBoundingClientRect().height / 2),
        config,
        type
      );
    }
  });
}

/**
 * Adds an empty property to the template
 */
function addEmptyProperty(
  plugin: CassettePlugin,
  state: TemplateSettingsState,
  config: TemplateConfig,
  type: 'anime' | 'manga'
): void {
  const newProp: PropertyItem = {
    id: generatePropertyId(),
    key: '',
    customName: '',
    order: config.properties.length + 1
  };
  
  config.properties.push(newProp);
  saveTemplateConfig(plugin, type, config);
  
  // Re-render just the property list
  const listEl = type === 'anime' ? state.animePropertyListEl : state.mangaPropertyListEl;
  if (listEl) {
    renderPropertyList(listEl, plugin, state, config, type);
  }
}

/**
 * Removes a property from the template
 */
async function removeProperty(
  plugin: CassettePlugin,
  state: TemplateSettingsState,
  id: string,
  config: TemplateConfig,
  type: 'anime' | 'manga'
): Promise<void> {
  config.properties = config.properties.filter(p => p.id !== id);
  reorderPropertiesSequentially(config);
  await saveTemplateConfig(plugin, type, config);
  
  // Re-render just the property list
  const listEl = type === 'anime' ? state.animePropertyListEl : state.mangaPropertyListEl;
  if (listEl) {
    renderPropertyList(listEl, plugin, state, config, type);
  }
}

/**
 * Reorders properties via drag and drop
 */
async function reorderProperties(
  plugin: CassettePlugin,
  state: TemplateSettingsState,
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
  
  reorderPropertiesSequentially(config);
  await saveTemplateConfig(plugin, type, config);
  
  // Re-render just the property list
  const listEl = type === 'anime' ? state.animePropertyListEl : state.mangaPropertyListEl;
  if (listEl) {
    renderPropertyList(listEl, plugin, state, config, type);
  }
}

/**
 * Reorders properties sequentially
 */
function reorderPropertiesSequentially(config: TemplateConfig): void {
  config.properties.forEach((prop, index) => {
    prop.order = index + 1;
  });
}

/**
 * Gets the template configuration for anime or manga
 */
function getTemplateConfig(plugin: CassettePlugin, type: 'anime' | 'manga'): TemplateConfig {
  if (type === 'anime') {
    return plugin.settings.animeTemplate 
      ? JSON.parse(JSON.stringify(plugin.settings.animeTemplate))
      : JSON.parse(JSON.stringify(DEFAULT_ANIME_TEMPLATE));
  } else {
    return plugin.settings.mangaTemplate
      ? JSON.parse(JSON.stringify(plugin.settings.mangaTemplate))
      : JSON.parse(JSON.stringify(DEFAULT_MANGA_TEMPLATE));
  }
}

/**
 * Saves the template configuration
 */
async function saveTemplateConfig(
  plugin: CassettePlugin,
  type: 'anime' | 'manga',
  config: TemplateConfig
): Promise<void> {
  if (type === 'anime') {
    plugin.settings.animeTemplate = config;
  } else {
    plugin.settings.mangaTemplate = config;
  }
  
  await plugin.saveSettings();
}
