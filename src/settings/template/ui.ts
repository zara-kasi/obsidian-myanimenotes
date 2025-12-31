import {
    Setting,
    setIcon,
    normalizePath,
    TextComponent,
    ExtraButtonComponent
} from "obsidian";
import type MyAnimeNotesPlugin from "../../main";
import { FolderSuggest, VariableSuggest } from "./suggesters";
import { TemplateConfig, PropertyItem } from "./types";
import {
    DEFAULT_ANIME_TEMPLATE,
    DEFAULT_MANGA_TEMPLATE,
    generatePropertyId
} from "./defaults";

import { getAvailableProperties } from "./metadata";

import {
    promptForPropertyType,
    getPropertyTypeIcon,
    getPropertyTypeLabel
} from "./properties";

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
                const docUrl =
                    "https://github.com/zara-kasi/obsidian-myanimenotes/blob/main/docs/template-guide.md";
                window.open(docUrl);
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
        new Setting(contentContainer)
            .setName("Properties")
            .setDesc(
                "Properties to add to the top of the media note. Use variables to populate data from the API."
            );

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
        new Setting(contentContainer).addButton(btn => {
            btn.setButtonText("Add property").onClick(() => {
                addEmptyProperty(plugin, state, config, type);
            });
        });

        // 3. Note Content Section
        new Setting(contentContainer)
            .setName("Note content")
            .setDesc(
                "Customize the content of the note. Use variables to populate data from the API."
            );

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
 */
function renderPropertyList(
    container: HTMLElement,
    plugin: MyAnimeNotesPlugin,
    state: TemplateSettingsState,
    config: TemplateConfig,
    type: "anime" | "manga",
    focusLastItem: boolean = false // <--- Added parameter
): void {
    container.empty();

    // Ensure properties are displayed in the correct order
    const sortedProps = [...config.properties].sort(
        (a, b) => a.order - b.order
    );

    sortedProps.forEach((prop, index) => {
        // Check if this is the last item and we requested focus
        const shouldFocus = focusLastItem && index === sortedProps.length - 1;
        renderPropertyRow(
            container,
            plugin,
            state,
            prop,
            config,
            type,
            shouldFocus
        );
    });
}

/**
 * Renders a single property row with inputs for name, template value, and drag/delete controls.
 */
function renderPropertyRow(
    container: HTMLElement,
    plugin: MyAnimeNotesPlugin,
    state: TemplateSettingsState,
    prop: PropertyItem,
    config: TemplateConfig,
    type: "anime" | "manga",
    shouldFocus: boolean = false // <--- Added parameter
): void {
    const rowEl = container.createDiv({ cls: "myanimenotes-property-row" });
    rowEl.setAttribute("draggable", "true");
    rowEl.setAttribute("data-id", prop.id);

    // Identify permanent system properties
    const isPermanent =
        prop.template === "myanimenotes" || prop.template === "synced";

    // Drag handle icon
    const dragHandle = rowEl.createDiv({ cls: "myanimenotes-drag-handle" });
    setIcon(dragHandle, "grip-vertical");

    // --- Property Type Icon Button (Native Component) ---
    const currentType = prop.type || "text";

    // Create the button using Obsidian's component
    const typeBtnComp = new ExtraButtonComponent(rowEl)
        .setIcon(getPropertyTypeIcon(currentType))
        .setTooltip(`Format: ${getPropertyTypeLabel(currentType)}`);

    // Add a class so we can still target it with CSS if needed (e.g. margins)
    typeBtnComp.extraSettingsEl.addClass("myanimenotes-type-icon");

    if (!isPermanent) {
        // Interactive state: Click to open menu
        typeBtnComp.onClick(() => {
            void (async () => {
                const selectedType = await promptForPropertyType(
                    plugin.app,
                    prop.customName
                );

                if (selectedType) {
                    // 1. Update Data
                    prop.type = selectedType;
                    await saveTemplateConfig(plugin, type, config);

                    // 2. Update Visuals (Icon & Tooltip)
                    typeBtnComp.setIcon(getPropertyTypeIcon(selectedType));
                    typeBtnComp.setTooltip(
                        `Format: ${getPropertyTypeLabel(selectedType)}`
                    );
                }
            })();
        });
    } else {
        // Read-only state: Greyed out and unclickable
        typeBtnComp.setDisabled(true);
        typeBtnComp.extraSettingsEl.addClass("myanimenotes-type-icon-readonly");
    }

    // --- 1. Property Name Input (Key) ---
    const nameInputComp = new TextComponent(rowEl);
    nameInputComp.inputEl.addClass("myanimenotes-property-name");
    nameInputComp
        .setValue(prop.customName)
        .setPlaceholder("Property name")
        .setDisabled(isPermanent);

    if (!isPermanent) {
        nameInputComp.onChange(async value => {
            prop.customName = value;
            await saveTemplateConfig(plugin, type, config);
        });
    }

    // --- 2. Template Variable Input (Value) ---
    const templateInputComp = new TextComponent(rowEl);
    templateInputComp.inputEl.addClass("myanimenotes-template-var");
    templateInputComp
        .setValue(prop.template || "")
        .setPlaceholder("Property value")
        .setDisabled(isPermanent);

    if (!isPermanent) {
        templateInputComp.onChange(async value => {
            prop.template = value;
            await saveTemplateConfig(plugin, type, config);
        });
    }

    // Attach Variable Suggester to the TextComponent's input element
    const variables = getAvailableProperties(type);
    new VariableSuggest(plugin.app, templateInputComp.inputEl, variables);

    // --- Delete Button (Native ExtraButtonComponent) ---
    if (!isPermanent) {
        new ExtraButtonComponent(rowEl)
            .setIcon("trash-2")
            .setTooltip("Delete property")
            .onClick(() => {
                void removeProperty(plugin, state, prop.id, config, type);
            });
    } else {
        rowEl.createDiv({ cls: "myanimenotes-delete-button-spacer" });
    }

    // --- Drag and Drop Event Handlers ---
    // (Keep your existing drag logic exactly as it is, copied below for completeness)
    rowEl.addEventListener("dragstart", e => {
        state.draggedElement = rowEl;
        rowEl.addClass("dragging");
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
    });

    rowEl.addEventListener("dragend", () => {
        rowEl.removeClass("dragging");
        state.draggedElement = null;
    });

    rowEl.addEventListener("dragover", e => {
        e.preventDefault();
        if (state.draggedElement && state.draggedElement !== rowEl) {
            const rect = rowEl.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            if (e.clientY < midpoint) {
                rowEl.addClass("drag-over-top");
                rowEl.removeClass("drag-over-bottom");
            } else {
                rowEl.addClass("drag-over-bottom");
                rowEl.removeClass("drag-over-top");
            }
        }
    });

    rowEl.addEventListener("dragleave", () => {
        rowEl.removeClass("drag-over-top");
        rowEl.removeClass("drag-over-bottom");
    });

    rowEl.addEventListener("drop", e => {
        e.preventDefault();
        rowEl.removeClass("drag-over-top");
        rowEl.removeClass("drag-over-bottom");
        if (state.draggedElement && state.draggedElement !== rowEl) {
            void reorderProperties(
                plugin,
                state,
                state.draggedElement.getAttribute("data-id") || "",
                prop.id,
                e.clientY <
                    rowEl.getBoundingClientRect().top +
                        rowEl.getBoundingClientRect().height / 2,
                config,
                type
            );
        }
    });

    // --- Auto Focus Logic ---
    if (shouldFocus) {
        nameInputComp.inputEl.focus();
    }
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
        // Pass 'true' to focus the last item (the one we just added)
        renderPropertyList(listEl, plugin, state, config, type, true);
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
