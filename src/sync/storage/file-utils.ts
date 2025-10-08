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
 * Formats start_season as "season year" (e.g., "winter 2024")
 */
export function formatStartSeason(season?: { year?: number; season?: string }): string | undefined {
  if (!season || !season.year || !season.season) return undefined;
  return `${season.season} ${season.year}`;
}