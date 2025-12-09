/**
 * Content Generator
 * 
 * Generates initial markdown file content with frontmatter + body
 * Body content is only applied once during file creation
 */

import type { UniversalMediaItem } from '../../transformers';
import { resolveTemplate } from './template-parser';

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
  frontmatterProps: Record<string, any>,
  noteContentTemplate: string,
  item: UniversalMediaItem
): string {
  // Generate frontmatter section
  const frontmatterYaml = generateFrontmatterYaml(frontmatterProps);
  
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

/**
 * Generates YAML frontmatter string from properties object
 * Simple serialization - handles strings, numbers, arrays
 * 
 * @param props - Frontmatter properties
 * @returns YAML string (without --- delimiters)
 */
function generateFrontmatterYaml(props: Record<string, any>): string {
  const lines: string[] = [];
  
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;
    
    if (Array.isArray(value)) {
      // Array: use YAML list format
      lines.push(`${key}:`);
      value.forEach(item => {
        const escaped = String(item).replace(/"/g, '\\"');
        lines.push(`  - "${escaped}"`);
      });
    } else if (typeof value === 'string') {
      // String: quote if contains special characters
      const needsQuotes = value.includes(':') || value.includes('#') || value.includes('\n');
      const escaped = value.replace(/"/g, '\\"');
      lines.push(`${key}: ${needsQuotes ? `"${escaped}"` : value}`);
    } else {
      // Number, boolean, etc.
      lines.push(`${key}: ${value}`);
    }
  }
  
  return lines.join('\n') + '\n';
}