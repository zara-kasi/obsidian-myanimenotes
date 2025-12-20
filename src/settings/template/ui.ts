import { Setting, setIcon, normalizePath } from "obsidian";
import type MyAnimeNotesPlugin from "../../main";
import { FolderSuggest, VariableSuggest } from "./suggesters";
import {
    TemplateConfig,
    PropertyItem,
    generatePropertyId,
    getAvailableProperties,
    DEFAULT_ANIME_TEMPLATE,
    DEFAULT_MANGA_TEMPLATE
} from "./config";
import { promptForPropertyType, getPropertyTypeIcon } from "./type";

/**
 * Renders the template configuration section
 */
export function renderTemplateSection(
    container: HTMLElement,
    plugin: MyAnimeNotesPlugin,
    templateState: TemplateSettingsState
): void {
    // Anime template expandable section
    renderExpandableTemplate(container, plugin, templateState, "anime");

    // Manga template expandable section
    renderExpandableTemplate(container, plugin, templateState, "manga");
}

/**
 * State management for template settings
 */
export interface TemplateSettingsState {
    animeTemplateExpanded: boolean;
    mangaTemplateExpanded: boolean;
    animePropertyListEl: HTMLElement | null;
    mangaPropertyListEl: HTMLElement | null;
    draggedElement: HTMLElement | null;
    refreshCallback: () => void;
}

/**
 * Creates initial template settings state
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
 * Renders an expandable template section for anime or manga
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

    // Main setting with toggle
    const setting = new Setting(container)
        .setName(`${type === "anime" ? "Anime" : "Manga"} Template`)
        .setDesc(
            `Configure how ${type} notes are created and which properties to include.`
        )
        .setClass("myanimenotes-template-setting");

    // Add collapse/expand icon to the setting element (not nameEl)
    const iconEl = setting.settingEl.createDiv({
        cls: "myanimenotes-collapse-icon"
    });
    setIcon(iconEl, isExpanded ? "chevron-down" : "chevron-right");

    // Make the entire setting clickable to toggle
    setting.settingEl.addClass("myanimenotes-clickable-setting");
    setting.settingEl.addEventListener("click", e => {
        // Don't toggle if clicking on input fields or buttons inside the expanded content
        if (
            (e.target as HTMLElement).closest(".myanimenotes-template-content")
        ) {
            return;
        }

        if (type === "anime") {
            state.animeTemplateExpanded = !state.animeTemplateExpanded;
        } else {
            state.mangaTemplateExpanded = !state.mangaTemplateExpanded;
        }
        state.refreshCallback();
    });

    // Expanded content container
    if (isExpanded) {
        const contentContainer = container.createDiv({
            cls: "myanimenotes-template-content"
        });

        // Folder path setting
        new Setting(contentContainer)
            .setName("Note location")
            .setDesc("The folder or path of the note.")
            .addText(text => {
                new FolderSuggest(plugin.app, text.inputEl);
                text.setPlaceholder(
                    `MyAnimeNotes/${type === "anime" ? "Anime" : "Manga"}`
                )
                    .setValue(config.folderPath)
                    .onChange(async value => {
                        // Normalize the path to handle cross-platform paths and user input variations
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

        // Properties section header
        contentContainer.createEl("h4", { text: "Properties" });

        // Add description
        contentContainer.createEl("p", {
            text: "Properties to add to the top of the media note. Use variables to populate data from the mal api.",
            cls: "setting-item-description"
        });

        // Properties list container
        const propertyListEl = contentContainer.createDiv({
            cls: "myanimenotes-property-list"
        });

        // Store reference for drag operations
        if (type === "anime") {
            state.animePropertyListEl = propertyListEl;
        } else {
            state.mangaPropertyListEl = propertyListEl;
        }

        renderPropertyList(propertyListEl, plugin, state, config, type);

        // Add property button
        const addButtonContainer = contentContainer.createDiv({
            cls: "myanimenotes-add-property-container"
        });
        const addButton = addButtonContainer.createEl("button", {
            cls: "myanimenotes-add-property-button"
        });

        // Create icon element inside the button
        const iconEl = addButton.createSpan({
            cls: "myanimenotes-button-icon"
        });
        setIcon(iconEl, "plus");

        // Add text after the icon
        addButton.createSpan({
            cls: "myanimenotes-button-text",
            text: "Add Property"
        });

        addButton.addEventListener("click", () => {
            addEmptyProperty(plugin, state, config, type);
        });

        // Note content template section
        contentContainer.createEl("h4", {
            text: "Note content",
            cls: "myanimenotes-section-header"
        });

        contentContainer.createEl("p", {
            text: "Customize the content of the note. Use variables to populate data from the mal api.",
            cls: "setting-item-description"
        });

        // Use Setting wrapper with custom class to hide separator line
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
 * Renders the list of properties
 */
function renderPropertyList(
    container: HTMLElement,
    plugin: MyAnimeNotesPlugin,
    state: TemplateSettingsState,
    config: TemplateConfig,
    type: "anime" | "manga"
): void {
    container.empty();

    // Sort properties by order
    const sortedProps = [...config.properties].sort(
        (a, b) => a.order - b.order
    );

    sortedProps.forEach(prop => {
        renderPropertyRow(container, plugin, state, prop, config, type);
    });
}

/**
 * Renders a single property row
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

    const isPermanent =
        prop.template === "myanimenotes" || prop.template === "synced";

    // Drag handle
    const dragHandle = rowEl.createDiv({ cls: "myanimenotes-drag-handle" });
    setIcon(dragHandle, "grip-vertical");

    // ========================================================================
    // TYPE ICON BUTTON (NEW)
    // ========================================================================
    const typeIconButton = rowEl.createDiv({
        cls: "myanimenotes-type-icon-button"
    });

    // Show icon based on current type (defaults to 'text' if not set)
    const currentType = prop.type || "text";
    const iconName = getPropertyTypeIcon(currentType);
    setIcon(typeIconButton, iconName);

    // Tooltip
    typeIconButton.setAttribute("aria-label", `Format: ${currentType}`);

    if (!isPermanent) {
        typeIconButton.addClass("myanimenotes-type-icon-clickable");

        typeIconButton.addEventListener("click", async e => {
            e.stopPropagation(); // Don't trigger drag

            // Open modal to select type
            const selectedType = await promptForPropertyType(
                plugin.app,
                prop.customName
            );

            if (selectedType) {
                // Save the type to config
                prop.type = selectedType;
                await saveTemplateConfig(plugin, type, config);

                // Update icon immediately
                typeIconButton.empty();
                const newIconName = getPropertyTypeIcon(selectedType);
                setIcon(typeIconButton, newIconName);
                typeIconButton.setAttribute(
                    "aria-label",
                    `Format: ${selectedType}`
                );
            }
        });
    } else {
        typeIconButton.addClass("myanimenotes-type-icon-readonly");
    }
    // ========================================================================
    // END TYPE ICON BUTTON
    // ========================================================================

    // Property name input
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

    // Template variable input
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
        templateInput.addEventListener("blur", e => {
            prop.template = (e.target as HTMLInputElement).value.trim();
            void saveTemplateConfig(plugin, type, config);
        });

        templateInput.addEventListener("input", e => {
            prop.template = (e.target as HTMLInputElement).value;
        });
    }

    // Delete button
    if (!isPermanent) {
        const deleteButton = rowEl.createDiv({
            cls: "myanimenotes-delete-button"
        });
        setIcon(deleteButton, "trash-2");
        deleteButton.addEventListener("click", () => {
            void removeProperty(plugin, state, prop.id, config, type);
        });
    } else {
        rowEl.createDiv({ cls: "myanimenotes-delete-button-spacer" });
    }

    // Variable suggester
    const variables = getAvailableProperties(type);
    new VariableSuggest(plugin.app, templateInput, variables);

    // Drag and drop events (unchanged)
    rowEl.addEventListener("dragstart", e => {
        state.draggedElement = rowEl;
        rowEl.addClass("dragging");
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
        }
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
}

/**
 * Adds an empty property to the template
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

    // Re-render just the property list
    const listEl =
        type === "anime"
            ? state.animePropertyListEl
            : state.mangaPropertyListEl;
    if (listEl) {
        renderPropertyList(listEl, plugin, state, config, type);
    }
}

/**
 * Removes a property from the template
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

    // Re-render just the property list
    const listEl =
        type === "anime"
            ? state.animePropertyListEl
            : state.mangaPropertyListEl;
    if (listEl) {
        renderPropertyList(listEl, plugin, state, config, type);
    }
}

/**
 * Reorders properties via drag and drop
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

    const [draggedProp] = config.properties.splice(draggedIndex, 1);

    const newTargetIndex = config.properties.findIndex(p => p.id === targetId);
    const insertIndex = insertBefore ? newTargetIndex : newTargetIndex + 1;

    config.properties.splice(insertIndex, 0, draggedProp);

    reorderPropertiesSequentially(config);
    await saveTemplateConfig(plugin, type, config);

    // Re-render just the property list
    const listEl =
        type === "anime"
            ? state.animePropertyListEl
            : state.mangaPropertyListEl;
    if (listEl) {
        renderPropertyList(listEl, plugin, state, config, type);
    }
}

/**
 * Reorders properties sequentially
 */
function reorderPropertiesSequentially(config: TemplateConfig): void {
    config.properties.forEach((prop, index) => {
        prop.order = index + 1;
    });
}

/**
 * Gets the template configuration for anime or manga
 */
function getTemplateConfig(
    plugin: MyAnimeNotesPlugin,
    type: "anime" | "manga"
): TemplateConfig {
    if (type === "anime") {
        return plugin.settings.animeTemplate
            ? JSON.parse(JSON.stringify(plugin.settings.animeTemplate))
            : JSON.parse(JSON.stringify(DEFAULT_ANIME_TEMPLATE));
    } else {
        return plugin.settings.mangaTemplate
            ? JSON.parse(JSON.stringify(plugin.settings.mangaTemplate))
            : JSON.parse(JSON.stringify(DEFAULT_MANGA_TEMPLATE));
    }
}

/**
 * Saves the template configuration
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
