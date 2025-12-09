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
  private inputEl: HTMLInputElement | HTMLTextAreaElement;
  private availableVariables: PropertyMetadata[];
  
  /**
   * Creates a new variable suggester
   * @param app Obsidian app instance
   * @param inputEl Input or textarea element to attach suggestions to
   * @param availableVariables List of variables to suggest (e.g., ANIME_PROPERTIES or MANGA_PROPERTIES)
   */
  constructor(
    app: App,
    inputEl: HTMLInputElement | HTMLTextAreaElement,
    availableVariables: PropertyMetadata[]
  ) {
    // Cast to HTMLInputElement for AbstractInputSuggest compatibility
    // TextArea works because it has the same .value and event handling
    super(app, inputEl as HTMLInputElement);
    this.inputEl = inputEl;
    this.availableVariables = availableVariables;
  }
  
   /**
   * Gets matching suggestions based on user input
   * For textarea: uses cursor position to find variables
   * For input: uses full string
   * 
   * @param inputStr Current input string
   * @returns Array of matching variables
   */
  getSuggestions(inputStr: string): PropertyMetadata[] {
    // Get cursor position for textarea
    let textBeforeCursor = inputStr;
    
    if (this.inputEl instanceof HTMLTextAreaElement) {
      const cursorPos = this.inputEl.selectionStart;
      textBeforeCursor = inputStr.substring(0, cursorPos);
    }
    
    // Check if user just typed {{ to trigger suggestions
    if (textBeforeCursor.endsWith('{{')) {
      return this.availableVariables;
    }
    
    // Find the last occurrence of {{ before cursor
    const lastOpenBracketIndex = textBeforeCursor.lastIndexOf('{{');
    
    // If no opening brackets found, don't show suggestions
    if (lastOpenBracketIndex === -1) {
      return [];
    }
    
    // Get text after the last {{
    const textAfterOpen = textBeforeCursor.substring(lastOpenBracketIndex + 2);
    
    // Check if there's a closing }} after the last {{
    const closingBracketIndex = textAfterOpen.indexOf('}}');
    
    // If there's already a closing }}, don't show suggestions
    if (closingBracketIndex !== -1) {
      return [];
    }
    
    // Extract text after the last {{ for filtering
    const cleanInput = textAfterOpen.trim().toLowerCase();
    
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
   * Handles cursor position for textarea
   * 
   * @param variable The selected variable
   */
  selectSuggestion(variable: PropertyMetadata): void {
    const currentValue = this.inputEl.value;
    let cursorPos = currentValue.length;
    
    // Get cursor position for textarea
    if (this.inputEl instanceof HTMLTextAreaElement) {
      cursorPos = this.inputEl.selectionStart;
    }
    
    // Get text before and after cursor
    const textBeforeCursor = currentValue.substring(0, cursorPos);
    const textAfterCursor = currentValue.substring(cursorPos);
    
    // Find the last occurrence of {{ before cursor
    const lastBracketIndex = textBeforeCursor.lastIndexOf('{{');
    
    if (lastBracketIndex !== -1) {
      // Get text before {{ and after cursor
      const beforeBrackets = currentValue.substring(0, lastBracketIndex);
      const afterBrackets = currentValue.substring(lastBracketIndex + 2);
      
      // Find closing }} in text after {{
      const textAfterOpen = textBeforeCursor.substring(lastBracketIndex + 2);
      const closingIndex = afterBrackets.indexOf('}}');
      
      if (closingIndex !== -1) {
        // Replace content between {{ and existing }}
        const remaining = afterBrackets.substring(closingIndex + 2);
        this.inputEl.value = `${beforeBrackets}{{${variable.key}}}${remaining}`;
      } else {
        // No closing bracket yet - add variable and closing brackets
        this.inputEl.value = `${beforeBrackets}{{${variable.key}}}${afterBrackets}`;
      }
      
      // Set cursor position after the inserted variable
      const newCursorPos = lastBracketIndex + variable.key.length + 4; // {{ + key + }}
      if (this.inputEl instanceof HTMLTextAreaElement) {
        this.inputEl.setSelectionRange(newCursorPos, newCursorPos);
      }
    } else {
      // First variable, no brackets yet
      this.inputEl.value = `${textBeforeCursor}{{${variable.key}}}${textAfterCursor}`;
      
      const newCursorPos = cursorPos + variable.key.length + 4;
      if (this.inputEl instanceof HTMLTextAreaElement) {
        this.inputEl.setSelectionRange(newCursorPos, newCursorPos);
      }
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
  inputEl: HTMLInputElement | HTMLTextAreaElement,
  variables: PropertyMetadata[]
): VariableSuggest {
  return new VariableSuggest(app, inputEl, variables);
}
