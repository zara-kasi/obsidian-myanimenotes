import { App, AbstractInputSuggest } from 'obsidian';
import type { PropertyMetadata } from './template-config';

/**
 * Variable Suggester for Template System
 * 
 * Provides autocomplete suggestions for template variables while typing.
 * Uses Obsidian's native AbstractInputSuggest API.
 * 
 * Usage:
 * ```typescript
 * const suggester = new VariableSuggest(app, inputEl, availableVariables);
 * ```
 */
export class VariableSuggest extends AbstractInputSuggest<PropertyMetadata> {
  private inputEl: HTMLInputElement;
  private availableVariables: PropertyMetadata[];
  
  /**
   * Creates a new variable suggester
   * @param app Obsidian app instance
   * @param inputEl Input element to attach suggestions to
   * @param availableVariables List of variables to suggest (e.g., ANIME_PROPERTIES or MANGA_PROPERTIES)
   */
  constructor(
    app: App,
    inputEl: HTMLInputElement,
    availableVariables: PropertyMetadata[]
  ) {
    super(app, inputEl);
    this.inputEl = inputEl;
    this.availableVariables = availableVariables;
  }
  
   /**
 * Gets matching suggestions based on user input
 * Filters variables by key or label (case-insensitive)
 * Triggers on {{ brackets for multiple variable support
 * 
 * @param inputStr Current input string
 * @returns Array of matching variables
 */
   getSuggestions(inputStr: string): PropertyMetadata[] {
  // Check if user just typed {{ to trigger suggestions
  if (inputStr.endsWith('{{')) {
    // Show all available variables when {{ is typed
    return this.availableVariables;
  }
  
  // Find the last occurrence of {{ that doesn't have a closing }}
  const lastBracketIndex = inputStr.lastIndexOf('{{');
  
  // If no opening brackets found, don't show suggestions
  if (lastBracketIndex === -1) {
    return [];
  }
  
  // Check if there's a closing }} after the last {{
  const textAfterBracket = inputStr.substring(lastBracketIndex + 2);
  const closingBracketIndex = textAfterBracket.indexOf('}}');
  
  // If there's already a closing }}, don't show suggestions
  if (closingBracketIndex !== -1) {
    return [];
  }
  
  // Extract text after the last {{ for filtering
  const cleanInput = textAfterBracket.trim().toLowerCase();
  
  // If input is empty (after extracting from brackets), show all available variables
  if (!cleanInput) {
    return this.availableVariables;
  }
  
  // Filter variables by matching key or label
  return this.availableVariables.filter(variable => 
    variable.key.toLowerCase().includes(cleanInput) ||
    variable.label.toLowerCase().includes(cleanInput)
  );
}
  
  /**
   * Renders a suggestion item in the dropdown
   * Shows both the variable key and a friendly label
   * 
   * @param variable The variable metadata to render
   * @param el The HTML element to render into
   */
  renderSuggestion(variable: PropertyMetadata, el: HTMLElement): void {
    const container = el.createDiv({ cls: 'cassette-variable-suggestion' });
    
    // Variable key (main text)
    container.createDiv({ 
      cls: 'cassette-variable-key',
      text: variable.key
    });
    
    // Variable label (description)
    container.createDiv({ 
      cls: 'cassette-variable-label',
      text: variable.label
    });
  }
  
 /**
 * Called when user selects a suggestion
 * Inserts the variable key with proper bracket handling
 * Supports multiple variables in one property
 * 
 * @param variable The selected variable
 */
selectSuggestion(variable: PropertyMetadata): void {
  const currentValue = this.inputEl.value;
  
  // Find the last occurrence of {{ to support multiple variables
  const lastBracketIndex = currentValue.lastIndexOf('{{');
  
  if (lastBracketIndex !== -1) {
    // Get the text before and after the {{
    const beforeBrackets = currentValue.substring(0, lastBracketIndex);
    const afterBrackets = currentValue.substring(lastBracketIndex + 2);
    
    // Check if there's already a closing bracket
    const closingIndex = afterBrackets.indexOf('}}');
    
    if (closingIndex !== -1) {
      // Replace content between {{ and existing }}
      const remaining = afterBrackets.substring(closingIndex + 2);
      this.inputEl.value = `${beforeBrackets}{{${variable.key}}}${remaining}`;
    } else {
      // No closing bracket yet - add variable and closing brackets
      // This keeps any text after the variable (like " ep")
      this.inputEl.value = `${beforeBrackets}{{${variable.key}}}${afterBrackets}`;
    }
  } else {
    // First variable, no brackets yet
    this.inputEl.value = `{{${variable.key}}}`;
  }
  
  // Trigger input event so any listeners are notified
  this.inputEl.trigger('input');
  
  // Close the suggestion dropdown
  this.close();
}
  
  /**
   * Updates the list of available variables
   * Useful when switching between anime/manga templates
   * 
   * @param newVariables New list of variables to suggest
   */
  updateVariables(newVariables: PropertyMetadata[]): void {
    this.availableVariables = newVariables;
  }
}

/**
 * Creates a variable suggester for an input element
 * Helper function for easy instantiation
 * 
 * @param app Obsidian app instance
 * @param inputEl Input element to attach suggestions to
 * @param variables List of variables to suggest
 * @returns VariableSuggest instance
 */
export function createVariableSuggest(
  app: App,
  inputEl: HTMLInputElement,
  variables: PropertyMetadata[]
): VariableSuggest {
  return new VariableSuggest(app, inputEl, variables);
}
