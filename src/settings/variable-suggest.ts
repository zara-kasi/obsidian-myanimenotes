import { App, AbstractInputSuggest } from 'obsidian';
import type { PropertyMetadata } from './template-config';

/**
 * Variable Suggester for Template System
 * 
 * Provides autocomplete suggestions for template variables while typing.
 * Supports mixed content and multiple variables in one template string.
 * Uses Obsidian's native AbstractInputSuggest API.
 * 
 * Features:
 * - Triggers when user types {{
 * - Supports multiple variables in one field
 * - Works with mixed content (text + variables)
 * - Inserts variables at cursor position
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
 * Intelligently detects when user is typing a variable and filters accordingly
 * 
 * @param inputStr Current input string (full value of input field)
 * @returns Array of matching variables
 */
getSuggestions(inputStr: string): PropertyMetadata[] {
  // Find the cursor position (we'll use end of string as proxy since we can't access cursor directly)
  // Find the last occurrence of {{ before cursor to detect if user is typing a variable
  const lastOpenBracket = inputStr.lastIndexOf('{{');
  
  // If no {{ found or it's already closed, don't show suggestions
  if (lastOpenBracket === -1) {
    return [];
  }
  
  // Extract text after the last {{
  const afterBracket = inputStr.substring(lastOpenBracket + 2);
  
  // If there's a closing }} after the last {{, user is not typing a variable
  const closeBracketIndex = afterBracket.indexOf('}}');
  if (closeBracketIndex !== -1 && closeBracketIndex < afterBracket.length - 2) {
    // The }} is not at the end, so user is past this variable
    return [];
  }
  
  // Extract the partial variable name (text between {{ and cursor/end)
  const partialVariable = afterBracket.replace(/\}\}$/, '').trim().toLowerCase();
  
  // If user just typed {{ (empty or only whitespace after it), show all variables
  if (!partialVariable) {
    return this.availableVariables;
  }
  
  // Filter variables by matching key or label
  return this.availableVariables.filter(variable => 
    variable.key.toLowerCase().includes(partialVariable) ||
    variable.label.toLowerCase().includes(partialVariable)
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
 * Inserts the variable with {{brackets}} at the correct position
 * Handles mixed content and multiple variables gracefully
 * 
 * @param variable The selected variable
 */
selectSuggestion(variable: PropertyMetadata): void {
  const currentValue = this.inputEl.value;
  
  // Find the last occurrence of {{ to determine insertion point
  const lastOpenBracket = currentValue.lastIndexOf('{{');
  
  if (lastOpenBracket === -1) {
    // No brackets found - shouldn't happen, but handle gracefully
    this.inputEl.value = `{{${variable.key}}}`;
  } else {
    // Split the string at the last {{
    const beforeBrackets = currentValue.substring(0, lastOpenBracket);
    const afterBrackets = currentValue.substring(lastOpenBracket + 2);
    
    // Check if there's already a }} after the {{
    const closeBracketIndex = afterBrackets.indexOf('}}');
    
    if (closeBracketIndex !== -1) {
      // Replace the content between {{ and }}
      const afterCloseBracket = afterBrackets.substring(closeBracketIndex + 2);
      this.inputEl.value = `${beforeBrackets}{{${variable.key}}}${afterCloseBracket}`;
    } else {
      // No closing bracket yet - add variable and close bracket
      // Keep any text that was after the {{
      this.inputEl.value = `${beforeBrackets}{{${variable.key}}}${afterBrackets}`;
    }
  }
  
  // Trigger input event so any listeners are notified
  this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
  
  // Close the suggestion dropdown
  this.close();
  
  // Focus back on the input
  this.inputEl.focus();
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
