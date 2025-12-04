/**
 * Frontmatter Builder
 * 
 * Builds frontmatter properties from media items with cassette as primary key
 * Handles merging with existing frontmatter while preserving user properties
 * 
 * REFACTORED: Removed manual YAML serialization
 * Now returns plain objects - Obsidian's FileManager.processFrontMatter handles YAML
 */

import type { UniversalMediaItem } from '../../models';
import type { TemplateConfig } from '../../settings/template-config';
import { 
  formatPropertyAsWikiLink,
  getWikiLinkFormatType,
  formatDuration,
} from '../file-utils';
import { evaluateTemplate } from './template-evaluator';

/**
 * Resolves a single variable from the template
 * This is a simplified version that directly accesses UniversalMediaItem properties
 * 
 * @param item - The media item
 * @param key - Variable name (e.g., 'numEpisodes', 'title')
 * @returns The resolved value or undefined if not found
 */
function resolvePropertyValue(
  item: UniversalMediaItem,
  key: string
): any {
  // Handle special permanent properties
  if (key === 'cassetteSync' || key === 'cassette') {
    return undefined; // These are handled separately in buildFrontmatterFromTemplate
  }
  
  if (key === 'updatedAt') {
    return item.updatedAt;
  }
  
  // Handle special extractions
  if (key === 'mainPicture') {
    return item.mainPicture?.large || item.mainPicture?.medium;
  }
  
  if (key === 'genres') {
    return item.genres?.map(g => g.name);
  }
  
  if (key === 'alternativeTitles') {
    return extractAliases(item.alternativeTitles);
  }
  
  // Direct property access for everything else
  return (item as any)[key];
}

/**
 * Applies special formatting to evaluated template values
 * Only applies formatting for specific known patterns
 * 
 * @param propertyName - The YAML property name (not the variable name)
 * @param evaluatedValue - The value after template evaluation
 * @param templateString - Original template string to check for patterns
 * @returns Formatted value
 */
function applySpecialFormatting(
  propertyName: string,
  evaluatedValue: any,
  templateString: string
): any {
  if (evaluatedValue === undefined || evaluatedValue === null || evaluatedValue === '') {
    return undefined;
  }
  
  // If template contains only a single variable (no mixed content),
  // apply wiki link formatting based on the variable name
  const singleVariableMatch = templateString.match(/^\{\{([^}]+)\}\}$/);
  if (singleVariableMatch) {
    const variableName = singleVariableMatch[1].trim();
    
    // Wiki link formatting for specific single-variable properties
    const wikiLinkType = getWikiLinkFormatType(variableName);
    if (wikiLinkType) {
      return formatPropertyAsWikiLink(evaluatedValue, wikiLinkType);
    }
    
    // Duration formatting (minutes -> "2h 30m")
    if (variableName === 'duration') {
      return formatDuration(evaluatedValue as number);
    }
  }
  
  // For mixed content templates, return as-is
  // User gets full control over the format
  return evaluatedValue;
}

/**
 * Extracts alternative titles as an array for Obsidian's aliases property
 */
function extractAliases(alternativeTitles: any): string[] | undefined {
  if (!alternativeTitles) return undefined;
  
  const aliases: string[] = [];
  if (alternativeTitles.en) aliases.push(alternativeTitles.en);
  if (alternativeTitles.ja) aliases.push(alternativeTitles.ja);
  if (alternativeTitles.synonyms) {
    aliases.push(...alternativeTitles.synonyms);
  }
  
  return aliases.length > 0 ? aliases : undefined;
}

/**
 * Builds frontmatter properties from template configuration
 * Evaluates template strings and replaces {{variables}} with actual values
 * 
 * @param item - Universal media item
 * @param template - Template configuration with property definitions
 * @param cassetteSync - Cassette identifier
 * @returns Frontmatter properties object
 */

export function buildFrontmatterFromTemplate(
  item: UniversalMediaItem,
  template: TemplateConfig,
  cassetteSync: string
): Record<string, any> {
  const properties: Record<string, any> = {};
  
  // Process each template property in order
  for (const prop of template.properties) {
    // Get the actual property names (handle both old and new formats)
    const propName = (prop as any).propertyName || (prop as any).customName;
    const templateString = ((prop as any).template || `{{${(prop as any).key}}}`).trim();
    
    // Skip if we don't have a property name
    if (!propName) {
      continue;
    }
    
    // Skip empty templates
    if (!templateString) {
      continue;
    }
    
    // Handle special {{cassette}} variable
    if (templateString === '{{cassette}}' || templateString === '{{cassetteSync}}') {
      properties[propName] = cassetteSync;
      continue;
    }
    
    // Handle special {{updatedAt}} variable
    if (templateString === '{{updatedAt}}') {
      if (item.updatedAt) {
        properties[propName] = item.updatedAt;
      }
      continue;
    }
    
    // Evaluate the template string (handles mixed content)
    const evaluatedValue = evaluateTemplate(templateString, item);
    
    // Skip if evaluation resulted in empty/undefined
    if (evaluatedValue === undefined || evaluatedValue === null || evaluatedValue === '') {
      continue;
    }
    
    // Apply special formatting (wiki links for single variables, etc.)
    const formattedValue = applySpecialFormatting(
      propName,
      evaluatedValue,
      templateString
    );
    
    // Add to properties if we have a value after formatting
    if (formattedValue !== undefined && formattedValue !== null && formattedValue !== '') {
      properties[propName] = formattedValue;
    }
  }
  
  return properties;
}