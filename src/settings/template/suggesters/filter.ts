import { App, AbstractInputSuggest } from "obsidian";
import type { FilterMetadata } from "../filters/metadata";
import { searchFilters } from "../filters/metadata";

/**
 * Filter Suggester for the Template System.
 *
 * Provides autocomplete for template filters when the user types a pipe `|`
 * inside a variable block (e.g., `{{ variable | fi... }`).
 */
export class FilterSuggest extends AbstractInputSuggest<FilterMetadata> {
    private inputEl: HTMLInputElement;

    constructor(app: App, inputEl: HTMLInputElement) {
        super(app, inputEl);
        this.inputEl = inputEl;
    }

    /**
     * Logic to trigger suggestions:
     * 1. Check if we are inside an open variable block `{{`.
     * 2. Check if that block contains a pipe `|`.
     * 3. Use the text after the last pipe as the search query.
     */
    getSuggestions(inputStr: string): FilterMetadata[] {
        // 1. Find the last opening bracket
        const lastOpenIndex = inputStr.lastIndexOf("{{");
        if (lastOpenIndex === -1) return [];

        // 2. Extract context from the bracket to the cursor/end
        const context = inputStr.substring(lastOpenIndex);

        // If the block is already closed with }}, we are outside. Abort.
        if (context.includes("}}")) return [];

        // 3. Find the last pipe inside this context
        const lastPipeIndex = context.lastIndexOf("|");
        if (lastPipeIndex === -1) return [];

        // 4. Extract the partial filter name (after the pipe)
        // inputStr:  "{{ title | wi"
        // context:   "{{ title | wi"
        // lastPipe:  index of |
        // query:     "wi"
        const query = context.substring(lastPipeIndex + 1).trim();

        // 5. Search using the helper from filter_metadata.ts
        return searchFilters(query);
    }

    /**
     * Renders the suggestion with Name, Hint (args), and Description.
     */
    renderSuggestion(filter: FilterMetadata, el: HTMLElement): void {
        const container = el.createDiv({
            cls: "myanimenotes-filter-suggestion"
        });

        // Top Row: Header containing Name + Hint
        const header = container.createDiv({
            cls: "myanimenotes-filter-header"
        });

        // Filter Name
        header.createSpan({
            text: filter.name,
            cls: "myanimenotes-filter-name"
        });

        // Argument Hint (if exists)
        if (filter.argumentHint) {
            header.createSpan({
                text: filter.argumentHint,
                cls: "myanimenotes-filter-hint"
            });
        }

        // Bottom Row: Description
        container.createDiv({
            text: filter.description,
            cls: "myanimenotes-filter-desc"
        });
    }

    /**
     * Inserts the selected filter into the input field.
     */
    selectSuggestion(filter: FilterMetadata): void {
        const currentValue = this.inputEl.value;
        const lastOpenIndex = currentValue.lastIndexOf("{{");

        if (lastOpenIndex === -1) return;

        // Get the string segment *after* the last `{{`
        // e.g. "{{ title | wi"
        const context = currentValue.substring(lastOpenIndex);

        // Find the specific pipe we are replacing content for
        const pipeRelativeIndex = context.lastIndexOf("|");
        if (pipeRelativeIndex === -1) return;

        // Calculate absolute index of that pipe
        const pipeAbsoluteIndex = lastOpenIndex + pipeRelativeIndex;

        // "Before" part includes the pipe + 1 space
        // e.g. "{{ title |"
        const beforePipe = currentValue.substring(0, pipeAbsoluteIndex + 1);

        // Construct the new value
        // Result: "... {{ title | filterName"
        let newValue = `${beforePipe} ${filter.name}`;

        // UX Bonus: If the filter requires arguments (e.g., join:separator),
        // add the colon automatically to save a keystroke.
        if (filter.argumentHint && filter.argumentHint.startsWith(":")) {
            newValue += ":";
        }

        this.inputEl.value = newValue;

        // Trigger input event so Obsidian saves the setting
        this.inputEl.trigger("input");

        this.close();
    }
}
