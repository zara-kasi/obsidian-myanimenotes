/**
 * Markdown Generator
 * 
 * Generates complete markdown files with frontmatter and body content
 * Handles parsing existing files and preserving user content
 */
import type CassettePlugin from '../../main';
import type { UniversalMediaItem } from '../types';
import type { StorageConfig } from './storage-service';
import { DEFAULT_PROPERTY_MAPPING } from './property-mapping';
import { 
  buildSyncedFrontmatterProperties, 
  mergeFrontmatter, 
  serializeFrontmatter 
} from './frontmatter-builder';
import * as yaml from 'js-yaml';
import { createDebugLogger } from '../../utils/debug';


/**
 * Parses existing file content to extract frontmatter and body
 * Returns null if file doesn't have valid frontmatter structure
 */
export function parseExistingFile(content: string): { 
  frontmatter: Record<string, any>; 
  body: string;
} | null {
  // Check if content starts with frontmatter delimiter
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return null;
  }

  // Find the closing frontmatter delimiter
  const lines = content.split('\n');
  let closingIndex = -1;
  
  // Start from line 1 (skip the opening ---)
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closingIndex = i;
      break;
    }
  }

  // No closing delimiter found
  if (closingIndex === -1) {
    return null;
  }

  // Extract frontmatter content (between the --- delimiters)
  const frontmatterText = lines.slice(1, closingIndex).join('\n');
  
  // Extract body content (everything after closing ---)
  const body = lines.slice(closingIndex + 1).join('\n');

  // Parse YAML frontmatter
  let frontmatter: Record<string, any> = {};
  try {
    const parsed = yaml.load(frontmatterText);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      frontmatter = parsed as Record<string, any>;
    }
  } catch (error) {
    console.warn('[Markdown] Failed to parse existing frontmatter:', error);
    // Return empty frontmatter but preserve body
    return { frontmatter: {}, body };
  }

  return { frontmatter, body };
}

/**
 * Generates complete markdown content with cassette_sync in frontmatter
 * Preserves existing body content and merges frontmatter properties
 * 
 * BEHAVIOR:
 * - New files: Creates frontmatter with cassette_sync, empty body
 * - Existing files with frontmatter: Merges synced properties, preserves body
 * - Existing files without frontmatter: Adds frontmatter, preserves entire content as body
 */
export function generateMarkdownWithCassetteSync(
  plugin: CassettePlugin,
  item: UniversalMediaItem,
  config: StorageConfig,
  cassetteSync: string,
  existingContent?: string
): string {
  const debug = createDebugLogger(plugin, 'Markdown');
  const mapping = config.propertyMapping || DEFAULT_PROPERTY_MAPPING;
  
  // Build synced properties (controlled by sync system) with cassette_sync
  const syncedProperties = buildSyncedFrontmatterProperties(item, mapping, cassetteSync);
  
  let finalFrontmatter: Record<string, any>;
  let body = ''; // Default to empty body for new files
  
  if (existingContent) {
    const parsed = parseExistingFile(existingContent);
    if (parsed) {
      // File has valid frontmatter structure
      // Merge: preserve existing frontmatter + user body
      finalFrontmatter = mergeFrontmatter(parsed.frontmatter, syncedProperties);
      body = parsed.body; // Preserve existing body exactly
      debug.log('[Markdown] Merged frontmatter with cassette_sync and preserved body');
    } else {
      // File exists but has no valid frontmatter structure
      // Treat entire content as body and add new frontmatter
      finalFrontmatter = syncedProperties;
      body = existingContent; // Preserve entire content as body
      debug.log('[Markdown] No existing frontmatter found, added cassette_sync frontmatter and preserved content as body');
    }
  } else {
    // New file: use synced properties only
    finalFrontmatter = syncedProperties;
    debug.log('[Markdown] Creating new file with cassette_sync frontmatter');
  }
  
  // Serialize frontmatter to YAML
  const yamlContent = serializeFrontmatter(finalFrontmatter);
  
  // Build final markdown content
  // Format: ---\n<yaml>\n---\n<body>
  return `---\n${yamlContent}---\n${body}`;
}