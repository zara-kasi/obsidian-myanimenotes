/**
 * Markdown Generator - Template System Only
 * 
 * Uses ONLY templates for frontmatter generation
 * No more PropertyMapping or StorageConfig
 */
import { TFile } from 'obsidian';
import type CassettePlugin from '../../main';
import type { UniversalMediaItem } from '../../models';
import { getTemplate } from './template-helper';
import { buildFrontmatterFromTemplate } from './frontmatter-builder';
import { createDebugLogger } from '../../utils';

/**
 * Generates frontmatter properties for a media item
 * Uses template system from plugin settings
 * 
 * @param plugin Plugin instance
 * @param item Media item to generate properties for
 * @param cassetteSync Cassette identifier
 * @returns Frontmatter properties object
 */
export function generateFrontmatterProperties(
  plugin: CassettePlugin,
  item: UniversalMediaItem,
  cassetteSync: string
): Record<string, any> {
  // Get template for this category
  const template = getTemplate(plugin, item.category);
  
  // Build frontmatter using the template
  return buildFrontmatterFromTemplate(item, template, cassetteSync);
}

/**
 * Updates an existing markdown file's frontmatter
 * Preserves existing body content automatically via processFrontMatter
 * 
 * @param plugin Plugin instance
 * @param file File to update
 * @param frontmatterProps Properties to merge into frontmatter
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
    });
  } catch (error) {
    debug.log('[Markdown] Error updating frontmatter:', error);
    throw error;
  }
}
