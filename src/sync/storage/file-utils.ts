/**
 * File Utilities
 * 
 * Helper functions for file operations, path handling, and sanitization
 */

import type CassettePlugin from '../../main';

/**
 * Ensures a folder exists, creating it if necessary
 */
export async function ensureFolderExists(
  plugin: CassettePlugin,
  folderPath: string
): Promise<void> {
  const { vault } = plugin.app;
  const folder = vault.getAbstractFileByPath(folderPath);
  
  if (!folder) {
    await vault.createFolder(folderPath);
    console.log(`[FileUtils] Created folder: ${folderPath}`);
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
  vault: any,
  folderPath: string,
  baseFilename: string
): string {
  let filename = baseFilename;
  let counter = 1;
  
  while (vault.getAbstractFileByPath(`${folderPath}/${filename}`)) {
    const namePart = baseFilename.replace(/\.md$/, '');
    filename = `${namePart}-${counter}.md`;
    counter++;
  }
  
  if (counter > 1) {
    console.log(`[FileUtils] Generated unique filename: ${filename}`);
  }
  
  return filename;
}

/**
 * Sanitizes synopsis for YAML properties
 * Only keeps commas and periods, removes all other special characters
 */
export function sanitizeSynopsis(synopsis: string | undefined): string {
  if (!synopsis) return '';
  
  return synopsis
    .replace(/[\n\r\t]/g, ' ')
    .replace(/[^\w\s,.]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes a single genre name to be compatible with Obsidian tags
 * 
 * Obsidian tag requirements:
 * - No spaces allowed (spaces break tags)
 * - Can contain: letters, numbers, underscores (_), hyphens (-), forward slashes (/)
 * 
 * Rules applied:
 * 1. Convert to lowercase for consistency
 * 2. Replace spaces with hyphens
 * 3. Remove special characters except hyphens, underscores, and forward slashes
 * 4. Remove leading/trailing hyphens
 * 5. Collapse multiple consecutive hyphens into one
 * 
 * Examples:
 * "Slice of Life" -> "slice-of-life"
 * "Sci-Fi" -> "sci-fi"
 * "Action & Adventure" -> "action-adventure"
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