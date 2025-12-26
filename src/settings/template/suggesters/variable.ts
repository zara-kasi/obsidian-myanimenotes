import { App, AbstractInputSuggest } from "obsidian";
import type { PropertyMetadata } from "../types";

/**
 * Variable Suggester for the Template System.
 *
 * This class provides autocomplete suggestions for template variables (e.g., `{{title}}`)
 * as the user types into input fields. It leverages Obsidian's native `AbstractInputSuggest`
 * API to render a pop-over menu.
 *
 * @remarks
 * It is smart enough to handle multiple variables in a single string (e.g., "{{series}} - {{episode}}")
 * by only looking at the text following the last open bracket `{{`.
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
     * Creates a new variable suggester instance.
     *
     * @param app - The Obsidian App instance.
     * @param inputEl - The HTML Input element to attach the suggester to.
     * @param availableVariables - The list of metadata properties (Anime or Manga) to suggest.
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
     * Determines which suggestions to show based on the current user input.
     *
     * Logic:
     * 1. Detects if the user has typed `{{`.
     * 2. Extracts the partial text after the last `{{`.
     * 3. Filters the `availableVariables` list by matching keys or labels.
     *
     * @param inputStr - The current value of the input field.
     * @returns An array of matching PropertyMetadata objects.
     */
    getSuggestions(inputStr: string): PropertyMetadata[] {
        // TRIGGER 1: Immediate suggestion when user types "{{ "
        if (inputStr.endsWith("{{")) {
            return this.availableVariables;
        }

        // Find the start of the current variable context
        const lastOpenBracketIndex = inputStr.lastIndexOf("{{");

        // If no opening brackets are found, we are not in a variable context -> No suggestions
        if (lastOpenBracketIndex === -1) {
            return [];
        }

        // Get the text specifically after the last `{{`
        const textAfterOpen = inputStr.substring(lastOpenBracketIndex + 2);

        // Check if this specific variable block is already closed with `}}`
        const closingBracketIndex = textAfterOpen.indexOf("}}");

        // If there is a closing bracket, the user is likely typing text *after* a variable,
        // so we should not show suggestions for the closed variable.
        if (closingBracketIndex !== -1) {
            return [];
        }

        // Prepare the search term
        const cleanInput = textAfterOpen.trim().toLowerCase();

        // If the user hasn't typed a filter term yet (just `{{`), show everything
        if (!cleanInput) {
            return this.availableVariables;
        }

        // Filter variables: match against the ID key (e.g. "numEpisodes") or the UI label (e.g. "Total Episodes")
        return this.availableVariables.filter(
            variable =>
                variable.key.toLowerCase().includes(cleanInput) ||
                variable.label.toLowerCase().includes(cleanInput)
        );
    }

    /**
     * Renders a single suggestion item within the dropdown menu.
     * Displays the raw variable key alongside its user-friendly label.
     *
     * @param variable - The variable metadata object to render.
     * @param el - The parent container element for this suggestion.
     */
    renderSuggestion(variable: PropertyMetadata, el: HTMLElement): void {
        const container = el.createDiv({
            cls: "myanimenotes-variable-suggestion"
        });

        // Main text: The actual variable key (e.g., "title")
        container.createDiv({
            cls: "myanimenotes-variable-key",
            text: variable.key
        });

        // Subtext: The description (e.g., "Media Title")
        container.createDiv({
            cls: "myanimenotes-variable-label",
            text: variable.label
        });
    }

    /**
     * Handler called when the user selects a suggestion from the list.
     * It correctly replaces the partial input (e.g., `{{ti`) with the full variable `{{title}}`.
     *
     * @param variable - The selected variable metadata.
     */
    selectSuggestion(variable: PropertyMetadata): void {
        const currentValue = this.inputEl.value;

        // Locate the active variable block
        const lastBracketIndex = currentValue.lastIndexOf("{{");

        if (lastBracketIndex !== -1) {
            // Split string into "Before {{", "Active Block", "Rest"
            const beforeBrackets = currentValue.substring(0, lastBracketIndex);
            const afterBrackets = currentValue.substring(lastBracketIndex + 2);

            // Check if a closing bracket already exists (though getSuggestions usually prevents this case)
            const closingIndex = afterBrackets.indexOf("}}");

            if (closingIndex !== -1) {
                // If closing brackets exist, preserve the text *after* them
                const remaining = afterBrackets.substring(closingIndex + 2);
                this.inputEl.value = `${beforeBrackets}{{${variable.key}}}${remaining}`;
            } else {
                // Normal case: User was typing `{{partial`, so we replace `partial` with `key}}`
                this.inputEl.value = `${beforeBrackets}{{${variable.key}}}`;
            }
        } else {
            // Fallback: If somehow triggered without brackets (unlikely via getSuggestions), just insert it.
            this.inputEl.value = `{{${variable.key}}}`;
        }

        // Programmatically trigger the 'input' event so Obsidian detects the change
        // and updates any listeners (like the autosave config logic).
        this.inputEl.trigger("input");

        // Close the dropdown
        this.close();
    }

    /**
     * Dynamically updates the list of available variables.
     * Useful when the user switches between "Anime" and "Manga" tabs in settings,
     * allowing reuse of the same suggester instance.
     *
     * @param newVariables - The new list of properties to suggest.
     */
    updateVariables(newVariables: PropertyMetadata[]): void {
        this.availableVariables = newVariables;
    }
}

/**
 * Helper factory function to create and attach a VariableSuggest instance.
 *
 * @param app - The Obsidian App instance.
 * @param inputEl - The input element to enhance.
 * @param variables - The list of variables to suggest.
 * @returns The active VariableSuggest instance.
 */
export function createVariableSuggest(
    app: App,
    inputEl: HTMLInputElement,
    variables: PropertyMetadata[]
): VariableSuggest {
    return new VariableSuggest(app, inputEl, variables);
}
