/**
 * Content Generator
 * 
 * Generates initial markdown file content with frontmatter + body
 * Body content is only applied once during file creation
 */

import { stringifyYaml } from 'obsidian';
import type { UniversalMediaItem } from '../../transformers';
import { resolveTemplate } from '../../settings/template';

/**
 * Generates complete initial file content
 * Combines frontmatter properties + resolved note content template
 * 
 * @param frontmatterProps - Frontmatter properties object
 * @param noteContentTemplate - Note content template string
 * @param item - Media item for variable resolution
 * @returns Complete markdown content with frontmatter + body
 */
export function generateInitialFileContent(
  frontmatterProps: Record<string, unknown>,
  noteContentTemplate: string,
  item: UniversalMediaItem
): string {
  // Use Obsidian's built-in YAML serializer
  const frontmatterYaml = stringifyYaml(frontmatterProps);
  
  // Resolve variables in note content template
  const resolvedContent = noteContentTemplate.trim()
    ? resolveTemplate(noteContentTemplate, item) || ''
    : '';
  
  // Combine: frontmatter + blank line + content
  if (resolvedContent) {
    return `---\n${frontmatterYaml}---\n\n${resolvedContent}`;
  } else {
    return `---\n${frontmatterYaml}---\n`;
  }
}