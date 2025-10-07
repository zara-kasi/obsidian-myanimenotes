// src/settings/property-settings.ts
// Settings UI for property customization

import { Setting } from 'obsidian';
import type CassettePlugin from '../main';
import { DEFAULT_PROPERTY_MAPPING, DEFAULT_PROPERTY_TEMPLATE } from '../sync/storage/property-mapping';

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
    { key: 'userStatus', label: 'My Status', default: 'my_status' },
    { key: 'userScore', label: 'My Score', default: 'my_score' },
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
        .setValue(plugin.settings.propertyMapping[field.key as keyof typeof plugin.settings.propertyMapping] || '')
        .onChange(async (value) => {
          plugin.settings.propertyMapping[field.key as keyof typeof plugin.settings.propertyMapping] = 
            value.trim() || field.default;
          await plugin.saveSettings();
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

/**
 * Renders property order template settings section
 */
export function renderPropertyOrderSection(
  container: HTMLElement,
  plugin: CassettePlugin
): void {
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
        .setValue(plugin.settings.propertyTemplate.anime.join('\n'))
        .onChange(async (value) => {
          plugin.settings.propertyTemplate.anime = value
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
          await plugin.saveSettings();
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
        .setValue(plugin.settings.propertyTemplate.manga.join('\n'))
        .onChange(async (value) => {
          plugin.settings.propertyTemplate.manga = value
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);
          await plugin.saveSettings();
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
        plugin.settings.propertyTemplate = { ...DEFAULT_PROPERTY_TEMPLATE };
        await plugin.saveSettings();
        plugin.refreshSettingsUI();
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