import { Setting } from 'obsidian';
import type CassettePlugin from '../main';
import { DEFAULT_PROPERTY_MAPPING } from '../sync/storage/property-mapping';

/**
 * Renders property mapping settings section
 */
export function renderPropertyMappingSection(
  container: HTMLElement,
  plugin: CassettePlugin
): void {
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
      .setValue(plugin.settings.useCustomPropertyMapping)
      .onChange(async (value) => {
        plugin.settings.useCustomPropertyMapping = value;
        await plugin.saveSettings();
        plugin.refreshSettingsUI();
      }));
  
  if (!plugin.settings.useCustomPropertyMapping) {
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
    { key: 'userStatus', label: 'My Status', default: 'list' },
    { key: 'userScore', label: 'My Score', default: 'rating' },
    { key: 'pictures', label: 'Banner/Additional Pictures', default: 'banner' },
  ];
  
  container.createEl('h4', { text: 'Common Fields' });
  
  commonFields.forEach(field => {
    new Setting(container)
      .setName(field.label)
      .addText(text => text
        .setPlaceholder(field.default)
        .setValue(plugin.settings.propertyMapping[field.key as keyof typeof plugin.settings.propertyMapping] || '')
        .onChange(async (value) => {
          plugin.settings.propertyMapping[field.key as keyof typeof plugin.settings.propertyMapping] = 
            value.trim() || field.default;
          await plugin.saveSettings();
        }));
  });
  
  // Anime-specific fields
  const animeFields = [
    { key: 'numEpisodes', label: 'Total Episodes', default: 'total_episodes' },
    { key: 'numEpisodesWatched', label: 'Episodes Watched', default: 'episodes' },
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
        .setValue(plugin.settings.propertyMapping[field.key as keyof typeof plugin.settings.propertyMapping] || '')
        .onChange(async (value) => {
          plugin.settings.propertyMapping[field.key as keyof typeof plugin.settings.propertyMapping] = 
            value.trim() || field.default;
          await plugin.saveSettings();
        }));
  });
  
  // Manga-specific fields
  const mangaFields = [
    { key: 'numVolumes', label: 'Total Volumes', default: 'total_volumes' },
    { key: 'numVolumesRead', label: 'Volumes Read', default: 'volumes_read' },
    { key: 'numChapters', label: 'Total Chapters', default: 'total_chapters' },
    { key: 'numChaptersRead', label: 'Chapters Read', default: 'chapters_read' },
    { key: 'authors', label: 'Authors', default: 'authors' },
  ];
  
  container.createEl('h4', { text: 'Manga-Specific Fields' });
  
  mangaFields.forEach(field => {
    new Setting(container)
      .setName(field.label)
      .addText(text => text
        .setPlaceholder(field.default)
        .setValue(plugin.settings.propertyMapping[field.key as keyof typeof plugin.settings.propertyMapping] || '')
        .onChange(async (value) => {
          plugin.settings.propertyMapping[field.key as keyof typeof plugin.settings.propertyMapping] = 
            value.trim() || field.default;
          await plugin.saveSettings();
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
        plugin.settings.propertyMapping = { ...DEFAULT_PROPERTY_MAPPING };
        await plugin.saveSettings();
        plugin.refreshSettingsUI();
      }));
}