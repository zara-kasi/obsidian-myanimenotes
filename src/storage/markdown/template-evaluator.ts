/**
 * Template Evaluator
 * 
 * Parses and evaluates template strings with {{variables}} and mixed content
 * Supports:
 * - Simple variables: {{title}}
 * - Mixed content: {{title}} - Series
 * - Multiple variables: {{numEpisodesWatched}}/{{numEpisodes}} episodes
 * - Text only: "Custom text here"
 */

import type { UniversalMediaItem } from '../../models';

/**
 * Regular expression to match {{variable}} patterns
 * Matches: {{anyText}} but not {{ }} (empty)
 */
const VARIABLE_PATTERN = /\{\{([^{}]+)\}\}/g;

/**
 * Extracts all variable names from a template string
 * 
 * @param template - Template string (e.g., "{{title}} - {{userScore}}/10")
 * @returns Array of variable names (e.g., ["title", "userScore"])
 * 
 * @example
 * extractVariables("{{title}} - {{userScore}}/10") 
 * // Returns: ["title", "userScore"]
 */
export function extractVariables(template: string): string[] {
  const variables: string[] = [];
  const matches = template.matchAll(VARIABLE_PATTERN);
  
  for (const match of matches) {
    const variableName = match[1].trim();
    if (variableName && !variables.includes(variableName)) {
      variables.push(variableName);
    }
  }
  
  return variables;
}

/**
 * Resolves a variable name to its value in UniversalMediaItem
 * 
 * @param item - Media item to extract value from
 * @param variableName - Variable name (e.g., "title", "numEpisodes")
 * @returns The value or undefined if not found
 */
export function resolveVariable(
  item: UniversalMediaItem,
  variableName: string
): any {
  // Handle special cases
  if (variableName === 'cassette' || variableName === 'cassetteSync') {
    return undefined; // Handled separately by frontmatter builder
  }
  
  if (variableName === 'updatedAt') {
    return item.updatedAt;
  }
  
  // Direct property access
  const value = (item as any)[variableName];
  
  // Handle nested objects (e.g., mainPicture.large)
  if (variableName === 'mainPicture') {
    return item.mainPicture?.large || item.mainPicture?.medium;
  }
  
  // Extract arrays to simple values
  if (variableName === 'genres' && Array.isArray(item.genres)) {
    return item.genres.map(g => g.name);
  }
  
  if (variableName === 'alternativeTitles') {
    const aliases: string[] = [];
    if (item.alternativeTitles?.en) aliases.push(item.alternativeTitles.en);
    if (item.alternativeTitles?.ja) aliases.push(item.alternativeTitles.ja);
    if (item.alternativeTitles?.synonyms) aliases.push(...item.alternativeTitles.synonyms);
    return aliases.length > 0 ? aliases : undefined;
  }
  
  return value;
}

/**
 * Formats a resolved value for display
 * Converts arrays to strings, handles objects, etc.
 * 
 * @param value - Raw value from resolveVariable
 * @returns Formatted string or original value
 */
export function formatValue(value: any): string | any {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }
  
  // Handle arrays (e.g., genres, studios, authors)
  if (Array.isArray(value)) {
    // Filter out empty values
    const filtered = value.filter(v => v !== null && v !== undefined && v !== '');
    
    // If array contains objects with 'name' property, extract names
    if (filtered.length > 0 && typeof filtered[0] === 'object' && 'name' in filtered[0]) {
      return filtered.map(item => item.name).join(', ');
    }
    
    // If array contains author objects
    if (filtered.length > 0 && typeof filtered[0] === 'object' && ('firstName' in filtered[0] || 'lastName' in filtered[0])) {
      return filtered.map(author => {
        const name = `${author.firstName || ''} ${author.lastName || ''}`.trim();
        return name || 'Unknown';
      }).join(', ');
    }
    
    // Simple array of strings/numbers
    return filtered.join(', ');
  }
  
  // Handle objects
  if (typeof value === 'object') {
    // Try to extract meaningful info
    if ('name' in value) {
      return value.name;
    }
    return JSON.stringify(value);
  }
  
  // Return as-is for strings, numbers, booleans
  return String(value);
}

/**
 * Evaluates a template string against a media item
 * Replaces all {{variables}} with their actual values
 * 
 * @param template - Template string (e.g., "{{title}} - {{userScore}}/10")
 * @param item - Media item to get values from
 * @returns Evaluated string with variables replaced
 * 
 * @example
 * evaluateTemplate("{{title}} - {{userScore}}/10", item)
 * // Returns: "Attack on Titan - 9/10"
 * 
 * @example
 * evaluateTemplate("Progress: {{numEpisodesWatched}}/{{numEpisodes}}", item)
 * // Returns: "Progress: 5/12"
 * 
 * @example
 * evaluateTemplate("Just plain text", item)
 * // Returns: "Just plain text"
 */
export function evaluateTemplate(
  template: string,
  item: UniversalMediaItem
): string | any {
  // If template has no variables, return as-is
  if (!template.includes('{{')) {
    return template;
  }
  
  // Replace all {{variables}} with their values
  let result = template;
  const variables = extractVariables(template);
  
  for (const variableName of variables) {
    const rawValue = resolveVariable(item, variableName);
    const formattedValue = formatValue(rawValue);
    
    // Replace all occurrences of this variable
    const variablePattern = new RegExp(`\\{\\{${variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g');
    result = result.replace(variablePattern, formattedValue);
  }
  
  // If the result is empty or only whitespace, return undefined
  // This prevents empty properties from being added
  const trimmed = result.trim();
  if (!trimmed || trimmed === '/' || trimmed === '-') {
    return undefined;
  }
  
  return result;
}

/**
 * Checks if a template string has any variables
 * 
 * @param template - Template string
 * @returns True if template contains {{variables}}
 */
export function hasVariables(template: string): boolean {
  return VARIABLE_PATTERN.test(template);
}

/**
 * Validates a template string
 * Checks for common issues like unclosed brackets
 * 
 * @param template - Template string to validate
 * @returns Validation result with error message if invalid
 */
export function validateTemplate(template: string): { valid: boolean; error?: string } {
  // Check for mismatched brackets
  const openCount = (template.match(/\{\{/g) || []).length;
  const closeCount = (template.match(/\}\}/g) || []).length;
  
  if (openCount !== closeCount) {
    return {
      valid: false,
      error: `Mismatched brackets: ${openCount} opening {{ but ${closeCount} closing }}`
    };
  }
  
  // Check for nested brackets (not supported)
  if (/\{\{[^}]*\{\{/.test(template)) {
    return {
      valid: false,
      error: 'Nested {{brackets}} are not supported'
    };
  }
  
  return { valid: true };
}