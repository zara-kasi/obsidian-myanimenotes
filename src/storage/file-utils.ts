/**
 * File Utilities
 * 
 * Helper functions for file operations, path handling, and sanitization
 */

import type CassettePlugin from '../main';
import { createDebugLogger } from '../utils';


/**
 * Ensures a folder exists, creating it if necessary
 */
export async function ensureFolderExists(
  plugin: CassettePlugin,
  folderPath: string
): Promise<void> {
  const debug = createDebugLogger(plugin, 'FileUtils');
  const { vault } = plugin.app;
  const folder = vault.getAbstractFileByPath(folderPath);
  
  if (!folder) {
    await vault.createFolder(folderPath);
    debug.log(`[FileUtils] Created folder: ${folderPath}`);
  }
}

/**
 * Sanitizes a filename by removing invalid characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generates unique filename if collision occurs
 * Appends -1, -2, etc. until a unique name is found
 */
export function generateUniqueFilename(
  plugin: CassettePlugin,
  vault: any,
  folderPath: string,
  baseFilename: string
): string {
  const debug = createDebugLogger(plugin, 'FileUtils');
  let filename = baseFilename;
  let counter = 1;
  
  while (vault.getAbstractFileByPath(`${folderPath}/${filename}`)) {
    const namePart = baseFilename.replace(/\.md$/, '');
    filename = `${namePart}-${counter}.md`;
    counter++;
  }
  
  if (counter > 1) {
    debug.log(`[FileUtils] Generated unique filename: ${filename}`);
  }
  
  return filename;
}

/**
 * Sanitizes synopsis for Obsidian YAML text properties
 * Preserves formatting and most punctuation while ensuring YAML compatibility
 * 
 * Key improvements:
 * - Preserves sentence structure and punctuation (!, ?, -, etc.)
 * - Normalizes whitespace without destroying paragraph breaks
 * - Escapes double quotes to prevent YAML parsing errors
 * - Handles colons safely (common in anime titles/descriptions)
 * - Removes control characters that can break YAML
 * 
 * @param synopsis - The synopsis text from MAL API
 * @returns Sanitized synopsis safe for Obsidian YAML text property
 */
export function sanitizeSynopsis(synopsis: string | undefined): string {
  if (!synopsis) return '';
  
  return synopsis
    // Remove null bytes and other control characters (except newlines/tabs)
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    
    // Normalize line breaks: convert multiple newlines to double space
    // This preserves paragraph breaks while keeping it single-line for YAML
    .replace(/\r\n/g, '\n')
    .replace(/\n\n+/g, '  ')  // Paragraph breaks become double spaces
    .replace(/\n/g, ' ')       // Single newlines become single spaces
    
    // Normalize tabs to spaces
    .replace(/\t/g, ' ')
    
    // Escape double quotes (critical for YAML)
    .replace(/"/g, '\\"')
    
    // Normalize multiple spaces to single space
    .replace(/\s{2,}/g, ' ')
    
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Alternative version using YAML multiline string format
 * Use this if you want to preserve exact line breaks in the synopsis
 * This will require changing how you write the YAML (using | or > indicators)
 * 
 * @param synopsis - The synopsis text from MAL API
 * @returns Sanitized synopsis with preserved line breaks
 */
export function sanitizeSynopsisMultiline(synopsis: string | undefined): string {
  if (!synopsis) return '';
  
  return synopsis
    // Remove control characters except newlines
    .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    
    // Normalize line endings
    .replace(/\r\n/g, '\n')
    
    // Remove excessive blank lines (max 1 blank line between paragraphs)
    .replace(/\n{3,}/g, '\n\n')
    
    // Escape double quotes
    .replace(/"/g, '\\"')
    
    // Trim but preserve internal structure
    .trim();
}

/**
 * Universal property formatter for Obsidian wiki links
 * Handles different data types and formats them appropriately
 * 
 * Supports:
 * - Single strings: 'tv' -> '[[TV]]'
 * - Arrays of strings: ['Action', 'Drama'] -> ['[[Action]]', '[[Drama]]']
 * - Arrays of objects: [{name: 'Ufotable'}] -> ['[[Ufotable]]']
 * - Author objects: {firstName: 'Hajime', lastName: 'Isayama'} -> '[[Hajime Isayama]]'
 * 
 * @param value - Raw value from API (string, array, or object)
 * @param formatType - Type of formatting to apply
 * @returns Formatted value with wiki links
 */
export function formatPropertyAsWikiLink(
  value: any,
  formatType: 'simple' | 'array' | 'nameArray' | 'authorArray' = 'simple'
): any {
  if (!value) {
    return formatType === 'array' || formatType === 'nameArray' || formatType === 'authorArray' 
      ? [] 
      : '[[Unknown]]';
  }

  switch (formatType) {
    case 'simple':
      return formatSimpleValue(value);
    
    case 'array':
      return formatStringArray(value);
    
    case 'nameArray':
      return formatObjectNameArray(value);
    
    case 'authorArray':
      return formatAuthorArray(value);
      
    case 'duration':
      return formatDuration(value);
    
    case 'platform':
      return formatPlatformDisplay(value);
    
    default:
      return value;
  }
}

// ============================================================
// Format Handlers
// ============================================================

/**
 * Formats simple string values
 * Handles: mediaType, source, category, platform
 */
function formatSimpleValue(value: string): string {
  if (!value || value === 'unknown') {
    return '[[Unknown]]';
  }

  // Special cases for acronyms (should be all caps)
  const acronyms = ['tv', 'ova', 'ona', 'mal'];
  const normalized = value.toLowerCase();
  
  if (acronyms.includes(normalized)) {
    return `[[${normalized.toUpperCase()}]]`;
  }

  // Split by underscore and capitalize each word
  const formatted = value
    .split('_')
    .map(word => {
      // Keep numbers as-is (e.g., '4' in '4_koma')
      if (/^\d+$/.test(word)) {
        return word;
      }
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
  
  return `[[${formatted}]]`;
}

/**
 * Formats array of strings
 * Handles: genres (already tag-sanitized), simple string arrays
 * Input: ['action', 'drama', 'slice-of-life']
 * Output: ['[[Action]]', '[[Drama]]', '[[Slice-of-Life]]']
 */
function formatStringArray(value: string | string[]): string[] {
  const array = Array.isArray(value) ? value : [value];
  
  return array.map(item => {
    if (!item || typeof item !== 'string') return '[[Unknown]]';
    
    // For genres that are already hyphenated (e.g., 'slice-of-life')
    // Just capitalize each word
    const formatted = item
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('-');
    
    return `[[${formatted}]]`;
  });
}

/**
 * Formats array of objects with 'name' property
 * Handles: studios [{name: 'Ufotable'}]
 * Output: ['[[Ufotable]]']
 */
function formatObjectNameArray(value: any[]): string[] {
  if (!Array.isArray(value)) return [];
  
  return value
    .filter(item => item && item.name)
    .map(item => `[[${item.name}]]`);
}

/**
 * Formats array of author objects
 * Handles: authors [{firstName: 'Hajime', lastName: 'Isayama'}]
 * Output: ['[[Hajime Isayama]]']
 */
function formatAuthorArray(value: any[]): string[] {
  if (!Array.isArray(value)) return [];
  
  return value
    .filter(author => author && (author.firstName || author.lastName))
    .map(author => {
      const fullName = `${author.firstName || ''} ${author.lastName || ''}`.trim();
      return fullName ? `[[${fullName}]]` : '[[Unknown Author]]';
    });
}

// ============================================================
// Type Detection Helper
// ============================================================

/**
 * Auto-detects the format type based on property key
 * Used in frontmatter-builder to automatically choose the right format
 */
export function getFormatTypeForProperty(propertyKey: string): 'simple' | 'array' | 'nameArray' | 'authorArray' | null {
  switch (propertyKey) {
    // Simple string properties
    case 'mediaType':
    case 'source':
    case 'category':
      return 'simple';
    
    // String array properties (already sanitized)
    case 'genres':
      return 'array';
    
    // Object array with 'name' property
    case 'studios':
      return 'nameArray';
    
    // Author objects
    case 'authors':
      return 'authorArray';
      
    // Special formatters
    case 'duration':
      return 'duration';
    
    case 'platform':
      return 'platform';
    
    // Don't format these properties
    default:
      return null;
  }
}


/**
 * Formats duration in minutes to human-readable format (e.g., "2h 20m", "45m")
 * 
 * @param minutes - Duration in minutes
 * @returns Formatted duration string
 * 
 * @example
 * formatDuration(150)  // "2h 30m"
 * formatDuration(45)   // "45m"
 * formatDuration(90)   // "1h 30m"
 * formatDuration(60)   // "1h"
 * formatDuration(0)    // undefined
 */
export function formatDuration(minutes: number | undefined): string | undefined {
  if (!minutes || minutes === 0) return undefined;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Formats platform identifier to display name
 * Internal: 'mal', 'simkl' (lowercase for cassette keys)
 * Display: 'MyAnimeList', 'Simkl' (readable names)
 * 
 * @param platform - Platform identifier (e.g., 'mal', 'simkl')
 * @returns Formatted platform name
 * 
 * @example
 * formatPlatformDisplay('mal')    // "MyAnimeList"
 * formatPlatformDisplay('simkl')  // "Simkl"
 */
export function formatPlatformDisplay(platform: string | undefined): string | undefined {
  if (!platform) return undefined;
  
  const platformMap: Record<string, string> = {
    'mal': 'MyAnimeList',
    'simkl': 'Simkl',
  };
  
  return platformMap[platform.toLowerCase()] || platform;
}