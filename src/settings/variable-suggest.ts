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
   * 
   * @param inputStr Current input string
   * @returns Array of matching variables
   */
  getSuggestions(inputStr: string): PropertyMetadata[] {
    // Remove leading/trailing whitespace and any template brackets
    const cleanInput = inputStr.trim().replace(/^\{\{|\}\}$/g, '').toLowerCase();
    
    // If input is empty, show all available variables
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
 * 
 * @param variable The selected variable
 */
  selectSuggestion(variable: PropertyMetadata): void {
  const currentValue = this.inputEl.value.trim();
  
  // Check if there are already opening brackets
  const hasOpeningBrackets = currentValue.startsWith('{{');
  // Check if there are already closing brackets
  const hasClosingBrackets = currentValue.endsWith('}}');
  
  let newValue: string;
  
  if (hasOpeningBrackets && hasClosingBrackets) {
    // Already has both brackets, just replace content
    newValue = `{{${variable.key}}}`;
  } else if (hasOpeningBrackets) {
    // Has opening brackets, add closing
    newValue = `{{${variable.key}}}`;
  } else if (hasClosingBrackets) {
    // Has closing brackets, add opening
    newValue = `{{${variable.key}}}`;
  } else {
    // No brackets, add both
    newValue = `{{${variable.key}}}`;
  }
  
  this.inputEl.value = newValue;
  
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
