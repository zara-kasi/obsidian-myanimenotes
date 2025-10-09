/**
 * File Utilities
 * 
 * Helper functions for file operations, path handling, and sanitization
 */

import type CassettePlugin from '../../main';
import { createDebugLogger } from '../utils/debug';


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
 * Sanitizes a single genre name to be compatible with Obsidian tags
 */
export function sanitizeGenreForTag(genre: string): string {
  return genre
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\s\-\/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Sanitizes an array of genre names for use as Obsidian tags
 * Filters out empty results and duplicates
 */
export function sanitizeGenresForTags(genres: string[]): string[] {
  if (!genres || !Array.isArray(genres)) {
    return [];
  }
  
  const sanitized = genres
    .map(sanitizeGenreForTag)
    .filter(tag => tag.length > 0);
  
  // Remove duplicates while preserving order
  return [...new Set(sanitized)];
}

/**
 * Sanitizes genres from UniversalGenre objects for use as Obsidian tags
 */
export function sanitizeGenreObjectsForTags(genres: Array<{ id: number; name: string }>): string[] {
  if (!genres || !Array.isArray(genres)) {
    return [];
  }
  
  return sanitizeGenresForTags(genres.map(g => g.name));
}

/**
 * Formats start_season as "season year" (e.g., "winter 2024")
 */
export function formatStartSeason(season?: { year?: number; season?: string }): string | undefined {
  if (!season || !season.year || !season.season) return undefined;
  return `${season.season} ${season.year}`;
}