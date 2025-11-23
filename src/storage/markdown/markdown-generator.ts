/**
 * Markdown Generator - Refactored for Obsidian FileManager API
 * 
 * Now uses Obsidian's FileManager.processFrontMatter() for safe frontmatter handling
 * Separates frontmatter generation from file writing
 */
import type CassettePlugin from '../../main';
import type { UniversalMediaItem } from '../../models';
import type { StorageConfig } from '../storage-service';
import { DEFAULT_PROPERTY_MAPPING } from './property-mapping';
import { buildSyncedFrontmatterProperties } from './frontmatter-builder';
import { TFile } from 'obsidian';
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
 * Creates a new markdown file with frontmatter
 * For new files, we create with body content since processFrontMatter requires existing file
 */
export async function createNewMarkdownFile(
  plugin: CassettePlugin,
  file: TFile,
  frontmatterProps: Record<string, any>,
  bodyContent: string = ''
): Promise<void> {
  const debug = createDebugLogger(plugin, 'Markdown');
  const { fileManager } = plugin.app;

  try {
    // Use processFrontMatter to safely write frontmatter
    // This also ensures Obsidian's cache is updated
    await fileManager.processFrontMatter(file, (frontmatter) => {
      // Merge all frontmatter properties
      Object.entries(frontmatterProps).forEach(([key, value]) => {
        frontmatter[key] = value;
      });
      
      debug.log('[Markdown] Created new file with frontmatter:', {
        filePath: file.path,
        properties: Object.keys(frontmatterProps)
      });
    });

    // If there's body content and file is empty, append it
    if (bodyContent.trim()) {
      const { vault } = plugin.app;
      const currentContent = await vault.read(file);
      
      // Check if file only has frontmatter (no body)
      if (!currentContent.includes('\n---\n')) {
        // File doesn't have proper structure yet, write it properly
        const frontmatterLines = Object.entries(frontmatterProps)
          .map(([key, val]) => formatFrontmatterLine(key, val))
          .join('\n');
        
        const newContent = `---\n${frontmatterLines}\n---\n${bodyContent}`;
        await vault.modify(file, newContent);
      }
    }
  } catch (error) {
    debug.log('[Markdown] Error creating markdown file:', error);
    throw error;
  }
}

/**
 * Updates an existing markdown file's frontmatter
 * Preserves existing body content automatically
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

/**
 * Helper: Formats a single frontmatter property for YAML
 * Handles different value types appropriately
 */
function formatFrontmatterLine(key: string, value: any): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value === 'string') {
    // Escape quotes and handle special characters
    const escaped = value.replace(/"/g, '\\"');
    return `${key}: "${escaped}"`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return `${key}: []`;
    return `${key}:\n${value.map(v => `  - ${formatValue(v)}`).join('\n')}`;
  }

  if (typeof value === 'object') {
    return `${key}: ${JSON.stringify(value)}`;
  }

  return `${key}: ${value}`;
}

/**
 * Helper: Formats individual values for YAML arrays
 */
function formatValue(value: any): string {
  if (typeof value === 'string') {
    const escaped = value.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  return String(value);
}

/**
 * Gets the body content from a file (everything after frontmatter)
 * Returns empty string if no body exists
 */
export function extractBodyFromFile(content: string): string {
  // Check if content starts with frontmatter delimiter
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return content; // No frontmatter, entire content is body
  }

  // Find the closing frontmatter delimiter
  const lines = content.split('\n');
  let closingIndex = -1;
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  if (closingIndex === -1) {
    return content; // No closing delimiter, treat as body
  }

  // Return everything after closing ---
  return lines.slice(closingIndex + 1).join('\n');
}

/**
 * Checks if a file has valid frontmatter structure
 */
export function hasValidFrontmatter(content: string): boolean {
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return false;
  }

  const lines = content.split('\n');
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      return true; // Found closing delimiter
    }
  }

  return false; // No closing delimiter
}