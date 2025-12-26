import { App, TFolder, TAbstractFile, AbstractInputSuggest } from 'obsidian';

/**
 * Folder Suggester for Text Inputs.
 * * Provides autocomplete suggestions for existing folders in the Obsidian vault.
 * This is used in the settings UI to help users select valid paths for saving notes.
 * * @extends AbstractInputSuggest<TFolder>
 */
export class FolderSuggest extends AbstractInputSuggest<TFolder> {
  inputEl: HTMLInputElement;

  /**
   * Creates a new folder suggester.
   * * @param app - The Obsidian App instance (access to vault).
   * @param inputEl - The HTML input element to attach the autocomplete to.
   */
  constructor(app: App, inputEl: HTMLInputElement) {
    super(app, inputEl);
    this.inputEl = inputEl;
  }

  /**
   * Retrieves a list of folders that match the user's current input.
   * * @param inputStr - The current text in the input field.
   * @returns An array of TFolder objects matching the query.
   */
  getSuggestions(inputStr: string): TFolder[] {
    // Get all files and folders currently loaded in the vault
    const abstractFiles = this.app.vault.getAllLoadedFiles();
    const folders: TFolder[] = [];
    const lowerCaseInputStr = inputStr.toLowerCase();

    abstractFiles.forEach((folder: TAbstractFile) => {
      // Filter: Must be a Folder AND match the search string (case-insensitive)
      if (
        folder instanceof TFolder &&
        folder.path.toLowerCase().contains(lowerCaseInputStr)
      ) {
        folders.push(folder);
      }
    });

    return folders;
  }

  /**
   * Renders a single folder suggestion in the dropdown list.
   * * @param folder - The folder object to display.
   * @param el - The DOM element to render into.
   */
  renderSuggestion(folder: TFolder, el: HTMLElement): void {
    // Display the full path of the folder
    el.setText(folder.path);
  }

  /**
   * Handles the selection of a folder from the dropdown.
   * Updates the input value and notifies listeners.
   * * @param folder - The selected folder object.
   */
  selectSuggestion(folder: TFolder): void {
    // Update the actual input field value
    this.inputEl.value = folder.path;
    
    // Programmatically trigger the 'input' event.
    // This is crucial so that Obsidian's Settings API detects the change and saves it.
    this.inputEl.trigger("input");
    
    this.close();
  }
}
