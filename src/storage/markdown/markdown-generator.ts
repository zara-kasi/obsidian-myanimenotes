/**
 * Markdown Generator - Refactored for Obsidian FileManager API
 * 
 * Now uses Obsidian's FileManager.processFrontMatter() for safe frontmatter handling
 * Separates frontmatter generation from file writing
 */
import { TFile } from 'obsidian';
import type CassettePlugin from '../../main';
import type { UniversalMediaItem } from '../../models';
import type { TemplateConfig } from '../../settings/template-config';
import { buildFrontmatterFromTemplate } from './frontmatter-builder';
import { createDebugLogger } from '../../utils';

/**
 * Generates frontmatter properties for a media item using template configuration
 * @param plugin Plugin instance
 * @param item Media item to generate frontmatter for
 * @param template Template configuration (anime or manga)
 * @param cassetteSync Cassette identifier
 * @returns Frontmatter properties object
 */
export function generateFrontmatterProperties(
  plugin: CassettePlugin,
  item: UniversalMediaItem,
  template: TemplateConfig,
  cassetteSync: string
): Record<string, any> {
  return buildFrontmatterFromTemplate(item, template, cassetteSync);
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
      
      
    });
  } catch (error) {
    debug.log('[Markdown] Error updating frontmatter:', error);
    throw error;
  }
}