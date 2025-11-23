/**
 * Markdown Generator - Refactored for Obsidian FileManager API
 * 
 * Now uses Obsidian's FileManager.processFrontMatter() for safe frontmatter handling
 * Separates frontmatter generation from file writing
 */
import { TFile } from 'obsidian';
import type CassettePlugin from '../../main';
import type { UniversalMediaItem } from '../../models';
import type { StorageConfig } from '../storage-service';
import { DEFAULT_PROPERTY_MAPPING } from './property-mapping';
import { buildSyncedFrontmatterProperties } from './frontmatter-builder';
import { createDebugLogger } from '../../utils';

/**
 * Generates frontmatter properties for a media item
 * This is separated from file I/O for testability
 */
export function generateFrontmatterProperties(
  plugin: CassettePlugin,
  item: UniversalMediaItem,
  config: StorageConfig,
  cassetteSync: string
): Record<string, any> {
  const mapping = config.propertyMapping || DEFAULT_PROPERTY_MAPPING;
  return buildSyncedFrontmatterProperties(item, mapping, cassetteSync);
}

/**
 * Updates an existing markdown file's frontmatter
 * Preserves existing body content automatically via processFrontMatter
 */
export async function updateMarkdownFileFrontmatter(
  plugin: CassettePlugin,
  file: TFile,
  frontmatterProps: Record<string, any>
): Promise<void> {
  const debug = createDebugLogger(plugin, 'Markdown');
  const { fileManager } = plugin.app;

  try {
    await fileManager.processFrontMatter(file, (frontmatter) => {
      // Merge synced properties into existing frontmatter
      // This preserves any user-added properties
      Object.entries(frontmatterProps).forEach(([key, value]) => {
        frontmatter[key] = value;
      });
      
      debug.log('[Markdown] Updated file frontmatter:', {
        filePath: file.path,
        properties: Object.keys(frontmatterProps)
      });
    });
  } catch (error) {
    debug.log('[Markdown] Error updating frontmatter:', error);
    throw error;
  }
}