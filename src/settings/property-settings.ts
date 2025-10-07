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
  
  // Common fields (for both anime and manga per updated reference)
  const commonFields = [
    { key: 'id', label: 'ID', default: 'id' },
    { key: 'title', label: 'Title', default: 'title' },
    { key: 'category', label: 'Category', default: 'category' },
    { key: 'platform', label: 'Platform', default: 'platform' },
    { key: 'mainPicture', label: 'Cover (Main Picture)', default: 'cover' },
    { key: 'pictures', label: 'Banner (Additional Pictures)', default: 'banner' },
    { key: 'synopsis', label: 'Synopsis', default: 'synopsis' },
    { key: 'mediaType', label: 'Type', default: 'type' },
    { key: 'status', label: 'Status', default: 'status' },
    { key: 'mean', label: 'Score (Average)', default: 'score' },
    { key: 'genres', label: 'Genres', default: 'genres' },
    { key: 'seasonYear', label: 'Season Year', default: 'season_year' },
    { key: 'seasonName', label: 'Season Name', default: 'season_name' },
    { key: 'source', label: 'Source Material', default: 'source' },
    { key: 'userStatus', label: 'List Status', default: 'list' },
    { key: 'userScore', label: 'Rating (My Score)', default: 'rating' },
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
    { key: 'startSeason', label: 'Start Season (combined format)', default: 'start_season' },
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