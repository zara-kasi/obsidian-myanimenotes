import { Setting, setIcon, normalizePath, Platform } from "obsidian";
import type MyAnimeNotesPlugin from "../../main";
import { FolderSuggest, VariableSuggest } from "./suggesters";
import { TemplateConfig, PropertyItem } from "./types";
import {
    DEFAULT_ANIME_TEMPLATE,
    DEFAULT_MANGA_TEMPLATE,
    generatePropertyId
} from "./defaults";

import { getAvailableProperties } from "./metadata";

import { promptForPropertyType, getPropertyTypeIcon } from "./properties";

/**
 * Renders the entire template configuration section within the settings tab.
 * This acts as the main entry point for the template UI.
 *
 * @param container - The HTML element to append the template settings to.
 * @param plugin - The main plugin instance.
 * @param templateState - The state object managing UI expansion and drag references.
 */
export function renderTemplateSection(
    container: HTMLElement,
    plugin: MyAnimeNotesPlugin,
    templateState: TemplateSettingsState
): void {
    // Render Anime template expandable section
    renderExpandableTemplate(container, plugin, templateState, "anime");

    // Render Manga template expandable section
    renderExpandableTemplate(container, plugin, templateState, "manga");
}

/**
 * Manages the internal state for the template settings UI.
 * Tracks which sections are expanded and holds references for drag-and-drop operations.
 */
export interface TemplateSettingsState {
    /** Whether the Anime template section is currently expanded. */
    animeTemplateExpanded: boolean;
    /** Whether the Manga template section is currently expanded. */
    mangaTemplateExpanded: boolean;
    /** Reference to the container element holding the list of Anime properties. */
    animePropertyListEl: HTMLElement | null;
    /** Reference to the container element holding the list of Manga properties. */
    mangaPropertyListEl: HTMLElement | null;
    /** The HTML element currently being dragged by the user. */
    draggedElement: HTMLElement | null;
    /** Callback function to trigger a UI refresh (usually calls `display()` on the setting tab). */
    refreshCallback: () => void;
}

/**
 * Factory function to create the initial template settings state.
 *
 * @param refreshCallback - The function to call when the UI needs to update.
 * @returns A new TemplateSettingsState object with default values.
 */
export function createTemplateSettingsState(
    refreshCallback: () => void
): TemplateSettingsState {
    return {
        animeTemplateExpanded: false,
        mangaTemplateExpanded: false,
        animePropertyListEl: null,
        mangaPropertyListEl: null,
        draggedElement: null,
        refreshCallback
    };
}

/**
 * Renders an individual expandable template section (either for Anime or Manga).
 * Handles the accordion behavior, folder settings, property list, and content template.
 *
 * @param container - The parent container.
 * @param plugin - The plugin instance.
 * @param state - The shared UI state.
 * @param type - The type of template to render ("anime" or "manga").
 */
function renderExpandableTemplate(
    container: HTMLElement,
    plugin: MyAnimeNotesPlugin,
    state: TemplateSettingsState,
    type: "anime" | "manga"
): void {
    const isExpanded =
        type === "anime"
            ? state.animeTemplateExpanded
            : state.mangaTemplateExpanded;
    const config = getTemplateConfig(plugin, type);

    // Main setting header with toggle functionality
    const setting = new Setting(container)
        .setName(`${type === "anime" ? "Anime" : "Manga"} Template`)
        .setDesc(`Configure the template used for ${type} notes.`)
        .setClass("myanimenotes-template-setting");

    // Add collapse/expand chevron icon
    const iconEl = setting.settingEl.createDiv({
        cls: "myanimenotes-collapse-icon"
    });
    setIcon(iconEl, isExpanded ? "chevron-down" : "chevron-right");

    // Make the entire setting header clickable to toggle expansion
    setting.settingEl.addClass("myanimenotes-clickable-setting");
    setting.settingEl.addEventListener("click", e => {
        // Prevent toggling if the user clicks on interactive elements inside the setting content
        if (
            (e.target as HTMLElement).closest(".myanimenotes-template-content")
        ) {
            return;
        }

        // Toggle state
        if (type === "anime") {
            state.animeTemplateExpanded = !state.animeTemplateExpanded;
        } else {
            state.mangaTemplateExpanded = !state.mangaTemplateExpanded;
        }
        // Trigger UI refresh
        state.refreshCallback();
    });

    // Render the expanded content if open
    if (isExpanded) {
        const contentContainer = container.createDiv({
            cls: "myanimenotes-template-content"
        });

        // 1 File Name Format Setting
        const fileNameDesc = document.createDocumentFragment();
        fileNameDesc.createSpan({
            text: "Format for the file name of the note. You can use variables to pre-populate data from the API. "
        });
        fileNameDesc
            .createEl("a", {
                text: "Learn more",
                href: "https://github.com/zara-kasi/obsidian-myanimenotes/blob/main/docs/template-guide.md"
            })
            .addEventListener("click", e => {
                e.preventDefault();
                void (async () => {
                    const docUrl =
                        "https://github.com/zara-kasi/obsidian-myanimenotes/blob/main/docs/template-guide.md";

                    if (Platform.isDesktop) {
                        // Desktop: Safely use Electron
                        if (window.require) {
                            const { shell } = window.require("electron") as {
                                shell: {
                                    openExternal: (
                                        url: string
                                    ) => Promise<void>;
                                };
                            };
                            await shell.openExternal(docUrl);
                        }
                    } else {
                        // Mobile
                        window.open(docUrl, "_blank");
                    }
                })();
            });

        new Setting(contentContainer)
            .setName("Note name")
            .setDesc(fileNameDesc)
            .addText(text => {
                // Attach the VariableSuggest to allow autocomplete of {{variables}}
                const variables = getAvailableProperties(type);
                new VariableSuggest(plugin.app, text.inputEl, variables);

                text.setPlaceholder("{{title}}")
                    .setValue(config.fileName || "{{title}}")
                    .onChange(async value => {
                        config.fileName = value;
                        await saveTemplateConfig(plugin, type, config);
                    });
            });

        // 1.5 Folder Path Setting
        new Setting(contentContainer)
            .setName("Note location")
            .setDesc("The folder or path of the note.")
            .addText(text => {
                // Attach folder suggestion logic to the input
                new FolderSuggest(plugin.app, text.inputEl);
                text.setPlaceholder(
                    `MyAnimeNotes/${type === "anime" ? "Anime" : "Manga"}`
                )
                    .setValue(config.folderPath)
                    .onChange(async value => {
                        // Normalize path to handle OS-specific separators
                        const normalizedPath = normalizePath(
                            value.trim() ||
                                `MyAnimeNotes/${
                                    type === "anime" ? "Anime" : "Manga"
                                }`
                        );
                        config.folderPath = normalizedPath;
                        await saveTemplateConfig(plugin, type, config);
                    });
            });

        // 2. Properties Section
        contentContainer.createEl("h4", { text: "Properties" });

        // Description with documentation link
        const propertiesDesc = contentContainer.createEl("p", {
            cls: "setting-item-description"
        });
        propertiesDesc.createSpan({
            text: "Properties to add to the top of the media note. Use variables to populate data from the API. "
        });
        propertiesDesc
            .createEl("a", {
                text: "Learn more",
                href: "https://github.com/zara-kasi/obsidian-myanimenotes/blob/main/docs/template-guide.md"
            })
            .addEventListener("click", e => {
                e.preventDefault();
                void (async () => {
                    const docUrl =
                        "https://github.com/zara-kasi/obsidian-myanimenotes/blob/main/docs/template-guide.md";

                    if (Platform.isDesktop) {
                        // Desktop: Safely use Electron
                        if (window.require) {
                            const { shell } = window.require("electron") as {
                                shell: {
                                    openExternal: (
                                        url: string
                                    ) => Promise<void>;
                                };
                            };
                            await shell.openExternal(docUrl);
                        }
                    } else {
                        // Mobile
                        window.open(docUrl, "_blank");
                    }
                })();
            });

        // Properties list container (target for re-rendering list items)
        const propertyListEl = contentContainer.createDiv({
            cls: "myanimenotes-property-list"
        });

        // Store reference to this list element in state for updates
        if (type === "anime") {
            state.animePropertyListEl = propertyListEl;
        } else {
            state.mangaPropertyListEl = propertyListEl;
        }

        // Initial render of property rows
        renderPropertyList(propertyListEl, plugin, state, config, type);

        // "Add Property" Button
        const addButtonContainer = contentContainer.createDiv({
            cls: "myanimenotes-add-property-container"
        });
        const addButton = addButtonContainer.createEl("button", {
            cls: "myanimenotes-add-property-button"
        });

        const addButtonIcon = addButton.createSpan({
            cls: "myanimenotes-button-icon"
        });
        setIcon(addButtonIcon, "plus");

        addButton.createSpan({
            cls: "myanimenotes-button-text",
            text: "Add Property"
        });

        addButton.addEventListener("click", () => {
            addEmptyProperty(plugin, state, config, type);
        });

        // 3. Note Content Section
        contentContainer.createEl("h4", {
            text: "Note content",
            cls: "myanimenotes-section-header"
        });

        contentContainer.createEl("p", {
            text: "Customize the content of the note. Use variables to populate data from the API.",
            cls: "setting-item-description"
        });

        // Content Template TextArea
        new Setting(contentContainer)
            .setClass("myanimenotes-textarea-setting")
            .addTextArea(textarea => {
                textarea
                    .setPlaceholder("# {{title}}\n\n{{synopsis}}\n")
                    .setValue(config.noteContent || "")
                    .onChange(async value => {
                        config.noteContent = value;
                        await saveTemplateConfig(plugin, type, config);
                    });

                textarea.inputEl.rows = 8;
                textarea.inputEl.addClass("myanimenotes-template-textarea");
            });
    }
}

/**
 * Renders the list of properties for a specific template.
 * Clears the container and rebuilds the rows based on the current configuration.
 *
 * @param container - The DOM element to render properties into.
 * @param plugin - Plugin instance.
 * @param state - UI state.
 * @param config - The template configuration containing the properties.
 * @param type - "anime" or "manga".
 */
function renderPropertyList(
    container: HTMLElement,
    plugin: MyAnimeNotesPlugin,
    state: TemplateSettingsState,
    config: TemplateConfig,
    type: "anime" | "manga"
): void {
    container.empty();

    // Ensure properties are displayed in the correct order
    const sortedProps = [...config.properties].sort(
        (a, b) => a.order - b.order
    );

    sortedProps.forEach(prop => {
        renderPropertyRow(container, plugin, state, prop, config, type);
    });
}

/**
 * Renders a single property row with inputs for name, template value, and drag/delete controls.
 * This function also attaches all necessary event listeners for drag-and-drop reordering.
 *
 * @param container - The parent property list container.
 * @param plugin - Plugin instance.
 * @param state - UI state.
 * @param prop - The specific property item to render.
 * @param config - The parent template config.
 * @param type - "anime" or "manga".
 */
function renderPropertyRow(
    container: HTMLElement,
    plugin: MyAnimeNotesPlugin,
    state: TemplateSettingsState,
    prop: PropertyItem,
    config: TemplateConfig,
    type: "anime" | "manga"
): void {
    const rowEl = container.createDiv({ cls: "myanimenotes-property-row" });
    rowEl.setAttribute("draggable", "true");
    rowEl.setAttribute("data-id", prop.id);

    // Identify permanent system properties that cannot be deleted or renamed
    const isPermanent =
        prop.template === "myanimenotes" || prop.template === "synced";

    // Drag handle icon
    const dragHandle = rowEl.createDiv({ cls: "myanimenotes-drag-handle" });
    setIcon(dragHandle, "grip-vertical");

    // ========================================================================
    // Property Type Icon Button
    // ========================================================================
    const typeIconButton = rowEl.createDiv({
        cls: "myanimenotes-type-icon-button"
    });

    const currentType = prop.type || "text";
    const iconName = getPropertyTypeIcon(currentType);
    setIcon(typeIconButton, iconName);

    typeIconButton.setAttribute("aria-label", `Format: ${currentType}`);

    // If not permanent, allow changing the property type via click
    if (!isPermanent) {
        typeIconButton.addClass("myanimenotes-type-icon-clickable");

        typeIconButton.addEventListener("click", e => {
            void (async () => {
                e.stopPropagation(); // Prevent drag initiation

                // Show modal to select new property type
                const selectedType = await promptForPropertyType(
                    plugin.app,
                    prop.customName
                );

                if (selectedType) {
                    prop.type = selectedType;
                    await saveTemplateConfig(plugin, type, config);

                    // Update UI immediately
                    typeIconButton.empty();
                    const newIconName = getPropertyTypeIcon(selectedType);
                    setIcon(typeIconButton, newIconName);
                    typeIconButton.setAttribute(
                        "aria-label",
                        `Format: ${selectedType}`
                    );
                }
            })();
        });
    } else {
        typeIconButton.addClass("myanimenotes-type-icon-readonly");
    }

    // ========================================================================
    // Property Inputs
    // ========================================================================

    // 1. Property Name Input (Key)
    const nameInput = rowEl.createEl("input", {
        cls: "myanimenotes-property-name",
        type: "text",
        value: prop.customName,
        attr: {
            placeholder: "Property name",
            ...(isPermanent && { readonly: "true" })
        }
    });

    if (!isPermanent) {
        nameInput.addEventListener("input", e => {
            prop.customName = (e.target as HTMLInputElement).value;
            void saveTemplateConfig(plugin, type, config);
        });
    }

    // 2. Template Variable Input (Value)
    const templateInput = rowEl.createEl("input", {
        cls: "myanimenotes-template-var",
        type: "text",
        value: prop.template || "",
        attr: {
            placeholder: "{{numEpisodes}} episodes",
            ...(isPermanent && { readonly: "true" })
        }
    });

    if (!isPermanent) {
        // Update on blur to avoid excessive saves while typing
        templateInput.addEventListener("blur", e => {
            prop.template = (e.target as HTMLInputElement).value.trim();
            void saveTemplateConfig(plugin, type, config);
        });

        // Update local object immediately for responsiveness
        templateInput.addEventListener("input", e => {
            prop.template = (e.target as HTMLInputElement).value;
        });
    }

    // Delete Button
    if (!isPermanent) {
        const deleteButton = rowEl.createDiv({
            cls: "myanimenotes-delete-button"
        });
        setIcon(deleteButton, "trash-2");
        deleteButton.addEventListener("click", () => {
            void removeProperty(plugin, state, prop.id, config, type);
        });
    } else {
        // Spacer to align read-only rows
        rowEl.createDiv({ cls: "myanimenotes-delete-button-spacer" });
    }

    // Attach Variable Suggester (auto-complete for {{variables}})
    const variables = getAvailableProperties(type);
    new VariableSuggest(plugin.app, templateInput, variables);

    // ========================================================================
    // Drag and Drop Event Handlers
    // ========================================================================

    // Start Dragging
    rowEl.addEventListener("dragstart", e => {
        state.draggedElement = rowEl;
        rowEl.addClass("dragging");
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
        }
    });

    // End Dragging
    rowEl.addEventListener("dragend", () => {
        rowEl.removeClass("dragging");
        state.draggedElement = null;
    });

    // Drag Over (Calculate drop position)
    rowEl.addEventListener("dragover", e => {
        e.preventDefault(); // Essential to allow dropping
        if (state.draggedElement && state.draggedElement !== rowEl) {
            const rect = rowEl.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;

            // Visual feedback: Show line above or below row based on mouse position
            if (e.clientY < midpoint) {
                rowEl.addClass("drag-over-top");
                rowEl.removeClass("drag-over-bottom");
            } else {
                rowEl.addClass("drag-over-bottom");
                rowEl.removeClass("drag-over-top");
            }
        }
    });

    // Drag Leave (Cleanup visual feedback)
    rowEl.addEventListener("dragleave", () => {
        rowEl.removeClass("drag-over-top");
        rowEl.removeClass("drag-over-bottom");
    });

    // Drop Action
    rowEl.addEventListener("drop", e => {
        e.preventDefault();
        // Cleanup styles
        rowEl.removeClass("drag-over-top");
        rowEl.removeClass("drag-over-bottom");

        if (state.draggedElement && state.draggedElement !== rowEl) {
            // Calculate exact drop position logic
            void reorderProperties(
                plugin,
                state,
                state.draggedElement.getAttribute("data-id") || "",
                prop.id, // Target ID
                // Determine if dropping before or after based on mouse Y position
                e.clientY <
                    rowEl.getBoundingClientRect().top +
                        rowEl.getBoundingClientRect().height / 2,
                config,
                type
            );
        }
    });
}

/**
 * Adds a new empty property to the configuration and refreshes the UI.
 *
 * @param plugin - Plugin instance.
 * @param state - UI state.
 * @param config - Template config.
 * @param type - "anime" or "manga".
 */
function addEmptyProperty(
    plugin: MyAnimeNotesPlugin,
    state: TemplateSettingsState,
    config: TemplateConfig,
    type: "anime" | "manga"
): void {
    const newProp: PropertyItem = {
        id: generatePropertyId(),
        template: "",
        customName: "",
        order: config.properties.length + 1
    };

    config.properties.push(newProp);
    void saveTemplateConfig(plugin, type, config);

    // Re-render just the property list part of the UI
    const listEl =
        type === "anime"
            ? state.animePropertyListEl
            : state.mangaPropertyListEl;
    if (listEl) {
        renderPropertyList(listEl, plugin, state, config, type);
    }
}

/**
 * Removes a property by ID and re-indexes the order of remaining properties.
 *
 * @param plugin - Plugin instance.
 * @param state - UI state.
 * @param id - The unique ID of the property to remove.
 * @param config - Template config.
 * @param type - "anime" or "manga".
 */
async function removeProperty(
    plugin: MyAnimeNotesPlugin,
    state: TemplateSettingsState,
    id: string,
    config: TemplateConfig,
    type: "anime" | "manga"
): Promise<void> {
    config.properties = config.properties.filter(p => p.id !== id);
    reorderPropertiesSequentially(config);
    await saveTemplateConfig(plugin, type, config);

    const listEl =
        type === "anime"
            ? state.animePropertyListEl
            : state.mangaPropertyListEl;
    if (listEl) {
        renderPropertyList(listEl, plugin, state, config, type);
    }
}

/**
 * Handles the logic for reordering properties after a drop event.
 * Moves the dragged item to the new index and saves the new order.
 *
 * @param plugin - Plugin instance.
 * @param state - UI state.
 * @param draggedId - ID of item being moved.
 * @param targetId - ID of item where it was dropped.
 * @param insertBefore - True if dropped before target, false if after.
 * @param config - Template config.
 * @param type - "anime" or "manga".
 */
async function reorderProperties(
    plugin: MyAnimeNotesPlugin,
    state: TemplateSettingsState,
    draggedId: string,
    targetId: string,
    insertBefore: boolean,
    config: TemplateConfig,
    type: "anime" | "manga"
): Promise<void> {
    const draggedIndex = config.properties.findIndex(p => p.id === draggedId);
    const targetIndex = config.properties.findIndex(p => p.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged item from old position
    const [draggedProp] = config.properties.splice(draggedIndex, 1);

    // Calculate new insertion index (adjusting for array mutation)
    const newTargetIndex = config.properties.findIndex(p => p.id === targetId);
    const insertIndex = insertBefore ? newTargetIndex : newTargetIndex + 1;

    // Insert at new position
    config.properties.splice(insertIndex, 0, draggedProp);

    reorderPropertiesSequentially(config);
    await saveTemplateConfig(plugin, type, config);

    const listEl =
        type === "anime"
            ? state.animePropertyListEl
            : state.mangaPropertyListEl;
    if (listEl) {
        renderPropertyList(listEl, plugin, state, config, type);
    }
}

/**
 * Normalizes the `order` property of all items in the list to be sequential (1, 2, 3...).
 * This ensures clean data before saving.
 */
function reorderPropertiesSequentially(config: TemplateConfig): void {
    config.properties.forEach((prop, index) => {
        prop.order = index + 1;
    });
}

/**
 * Retrieves the current template configuration from plugin settings.
 * Falls back to default templates if user settings are missing.
 *
 * @param plugin - Plugin instance.
 * @param type - "anime" or "manga".
 * @returns A deep copy of the template configuration.
 */
function getTemplateConfig(
    plugin: MyAnimeNotesPlugin,
    type: "anime" | "manga"
): TemplateConfig {
    // Deep copy JSON parse/stringify is used to avoid reference issues
    if (type === "anime") {
        return plugin.settings.animeTemplate
            ? (JSON.parse(
                  JSON.stringify(plugin.settings.animeTemplate)
              ) as TemplateConfig)
            : (JSON.parse(
                  JSON.stringify(DEFAULT_ANIME_TEMPLATE)
              ) as TemplateConfig);
    } else {
        return plugin.settings.mangaTemplate
            ? (JSON.parse(
                  JSON.stringify(plugin.settings.mangaTemplate)
              ) as TemplateConfig)
            : (JSON.parse(
                  JSON.stringify(DEFAULT_MANGA_TEMPLATE)
              ) as TemplateConfig);
    }
}

/**
 * Persists the modified template configuration to the plugin settings file (`data.json`).
 *
 * @param plugin - Plugin instance.
 * @param type - "anime" or "manga".
 * @param config - The updated configuration to save.
 */
async function saveTemplateConfig(
    plugin: MyAnimeNotesPlugin,
    type: "anime" | "manga",
    config: TemplateConfig
): Promise<void> {
    if (type === "anime") {
        plugin.settings.animeTemplate = config;
    } else {
        plugin.settings.mangaTemplate = config;
    }

    await plugin.saveSettings();
}
