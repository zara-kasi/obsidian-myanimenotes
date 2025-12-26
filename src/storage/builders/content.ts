/**
 * Content Generator
 * * Responsible for assembling the final string content for new Markdown files.
 * It combines structured metadata (Frontmatter) with the user's custom body template
 * into a single valid Markdown string.
 */

import { stringifyYaml } from 'obsidian';
import type { MediaItem } from '../../models';
import { resolveTemplate } from '../../settings/template';

/**
 * Generates the complete initial content for a new file.
 * This function handles the correct formatting of the YAML frontmatter block
 * and appends the processed body content based on the user's settings.
 * * Logic Flow:
 * 1. Serializes the properties object into valid YAML using Obsidian's internal helper.
 * 2. Resolves any placeholders (e.g., {{title}}) in the note content template.
 * 3. Concatenates them into the standard Obsidian format:
 * ---
 * key: value
 * ---
 * * # Body Content
 * * @param frontmatterProps - The key-value pairs to be placed in the YAML header.
 * @param noteContentTemplate - The raw template string for the note body (from settings).
 * @param item - The media item containing the data to inject into variables.
 * @returns A string containing the full file content, ready to be written to disk.
 */
export function generateInitialFileContent(
  frontmatterProps: Record<string, unknown>,
  noteContentTemplate: string,
  item: MediaItem
): string {
  // Use Obsidian's built-in YAML serializer to ensure correct formatting
  const frontmatterYaml = stringifyYaml(frontmatterProps);
  
  // Resolve variables in note content template
  // If the template is empty or whitespace-only, we treat it as empty.
  const resolvedContent = noteContentTemplate.trim()
    ? resolveTemplate(noteContentTemplate, item) || ''
    : '';
  
  // Combine: frontmatter + blank line + content
  if (resolvedContent) {
    // Handle edge case where resolvedContent might be an array (though usually string)
    const contentStr = Array.isArray(resolvedContent) 
      ? resolvedContent.join('\n') 
      : String(resolvedContent);
      
    return `---\n${frontmatterYaml}---\n\n${contentStr}`;
  } else {
    // If no body content, just return the frontmatter block
    return `---\n${frontmatterYaml}---\n`;
  }
}
