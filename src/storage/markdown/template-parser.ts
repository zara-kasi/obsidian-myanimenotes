/**
 * Template Parser
 * 
 * Resolves template strings by replacing {{variables}} with actual values from UniversalMediaItem.
 * Supports:
 * - Multiple variables: "{{numEpisodes}} episodes / {{numEpisodesWatched}} watched"
 * - Mixed content: "Score: {{userScore}}/10"
 * - Pure static text: "My custom value"
 * - User-controlled formatting: "[[{{studio}}]]" (user adds wiki links)
 */

import type { UniversalMediaItem } from '../../models';

/**
 * Extracts all variable names from a template string
 * 
 * @param template - Template string with {{variables}}
 * @returns Array of variable names found in template
 * 
 * @example
 * extractVariables("{{title}} - {{numEpisodes}} ep")
 * // Returns: ["title", "numEpisodes"]
 */
export function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    variables.push(match[1]);
  }
  
  return variables;
}

/**
 * Resolves a property value from UniversalMediaItem
 * Maps template variable names to actual item properties
 * 
 * @param item - Media item with data
 * @param variableName - Variable name to resolve
 * @returns Resolved value or undefined if not found
 */
function resolvePropertyValue(
  item: UniversalMediaItem,
  variableName: string
): any {
  // Map of variable names to item properties
  const valueMap: Record<string, any> = {
    // Basic fields
    'id': item.id,
    'title': item.title,
    'category': item.category,
    'platform': item.platform,
    'url': item.url,
    
    // Visual
    'mainPicture': item.mainPicture?.large || item.mainPicture?.medium,
    
    // Alternative titles - return as array for Obsidian aliases
    'alternativeTitles': extractAliases(item.alternativeTitles),
    
    // Description
    'synopsis': item.synopsis,
    
    // Metadata
    'mediaType': item.mediaType,
    'status': item.status,
    'mean': item.mean,
    
    // Genres - return as array of genre names
    'genres': item.genres?.map(g => g.name),
    
    // Dates
    'releasedStart': item.releasedStart,
    'releasedEnd': item.releasedEnd,
    'source': item.source,
    
    // Anime-specific
    'numEpisodes': item.numEpisodes,
    'numEpisodesWatched': item.numEpisodesWatched,
    'studios': item.studios?.map(s => s.name), // Extract studio names
    'duration': formatDuration(item.duration),
    
    // Manga-specific
    'numVolumes': item.numVolumes,
    'numVolumesRead': item.numVolumesRead,
    'numChapters': item.numChapters,
    'numChaptersRead': item.numChaptersRead,
    'authors': formatAuthors(item.authors),
    
    // User data
    'userStatus': item.userStatus,
    'userScore': item.userScore,
    'userStartDate': item.userStartDate,
    'userFinishDate': item.userFinishDate,
  };
  
  return valueMap[variableName];
}

/**
 * Resolves a template string by replacing {{variables}} with actual values
 * 
 * @param template - Template string with {{variables}} and custom text
 * @param item - Media item with data
 * @returns Resolved string, array (for special cases), or undefined if empty
 * 
 * @example
 * resolveTemplate("{{numEpisodes}} episodes", item)
 * // Returns: "24 episodes"
 * 
 * resolveTemplate("{{numEpisodesWatched}}/{{numEpisodes}}", item)
 * // Returns: "12/24"
 * 
 * resolveTemplate("My custom note", item)
 * // Returns: "My custom note"
 */
export function resolveTemplate(
  template: string,
  item: UniversalMediaItem
): any {
  if (!template || template.trim() === '') {
    return undefined;
  }
  
  // Extract all variables from template
  const variables = extractVariables(template);
  
  // Special case: if template is ONLY {{alternativeTitles}} or {{genres}}, return array directly
  // This preserves Obsidian's array property behavior for aliases and list properties
  if (template.trim() === '{{alternativeTitles}}') {
    return extractAliases(item.alternativeTitles);
  }
  
  if (template.trim() === '{{genres}}') {
    return item.genres?.map(g => g.name);
  }
  
  // If no variables found, return template as-is (static text)
  if (variables.length === 0) {
    return template;
  }
  
  // Replace each {{variable}} with its value
  let result = template;
  let hasAnyValue = false;
  
  for (const varName of variables) {
    const value = resolvePropertyValue(item, varName);
    
    if (value !== undefined && value !== null && value !== '') {
      hasAnyValue = true;
      
      // Handle array values - join with comma for string templates
      // (Arrays are only returned directly for pure {{alternativeTitles}} or {{genres}})
      let stringValue: string;
      if (Array.isArray(value)) {
        stringValue = value.join(', ');
      } else {
        stringValue = String(value);
      }
      
      // Replace all occurrences of this variable
      result = result.replace(
        new RegExp(`\\{\\{${varName}\\}\\}`, 'g'),
        stringValue
      );
    } else {
      // Remove the {{variable}} placeholder if no value exists
      result = result.replace(
        new RegExp(`\\{\\{${varName}\\}\\}`, 'g'),
        ''
      );
    }
  }
  
  // Clean up result - remove extra whitespace
  result = result.trim();
  
  // Return undefined if all variables were empty/undefined
  if (!hasAnyValue || result === '') {
    return undefined;
  }
  
  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extracts alternative titles into array format for Obsidian aliases
 */
function extractAliases(alternativeTitles: any): string[] | undefined {
  if (!alternativeTitles) return undefined;
  
  const aliases: string[] = [];
  
  if (alternativeTitles.en) aliases.push(alternativeTitles.en);
  if (alternativeTitles.ja) aliases.push(alternativeTitles.ja);
  if (alternativeTitles.synonyms && Array.isArray(alternativeTitles.synonyms)) {
    aliases.push(...alternativeTitles.synonyms);
  }
  
  return aliases.length > 0 ? aliases : undefined;
}

/**
 * Formats duration from minutes to human-readable string
 * 
 * @example
 * formatDuration(150) // "2h 30m"
 * formatDuration(45)  // "45m"
 */
function formatDuration(minutes: number | undefined): string | undefined {
  if (!minutes || minutes === 0) return undefined;
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) {
    return `${mins}m`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Formats author array into comma-separated string
 * 
 * @example
 * formatAuthors([{firstName: "Hajime", lastName: "Isayama"}])
 * // Returns: "Hajime Isayama"
 */
function formatAuthors(authors: any[] | undefined): string | undefined {
  if (!authors || authors.length === 0) return undefined;
  
  const authorNames = authors
    .map(a => {
      const firstName = a.firstName || '';
      const lastName = a.lastName || '';
      return `${firstName} ${lastName}`.trim();
    })
    .filter(Boolean); // Remove empty strings
  
  return authorNames.length > 0 ? authorNames.join(', ') : undefined;
}