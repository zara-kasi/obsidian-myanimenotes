import { App, PluginSettingTab, Setting } from "obsidian";
import MyAnimeNotesPlugin from "../main";
import {
    startAuthFlow as startMALAuth,
    logout as malLogout,
    isAuthenticated as isMALAuthenticated
} from "../auth";
import { fetchUserInfo } from "../auth/user-service";
import {
    renderTemplateSection,
    createTemplateSettingsState,
    TemplateSettingsState
} from "./template";
import { setNotificationsEnabled, showNotice } from "../utils/notice";
import { logger } from "../utils/logger";

/**
 * The Settings Tab for the MyAnimeNotes plugin.
 *
 * This class constructs the UI for the plugin's settings page in Obsidian,
 * allowing users to configure authentication, synchronization behavior,
 * notification preferences, and template options.
 */
export class MyAnimeNotesSettingTab extends PluginSettingTab {
    /** The reference to the main plugin instance. */
    plugin: MyAnimeNotesPlugin;

    /**
     * Manages the internal state of the template settings section.
     * This handles the complexity of dynamic template variable rendering.
     */
    private templateState: TemplateSettingsState;

    /**
     * Creates a new instance of the settings tab.
     *
     * @param app - The Obsidian App instance.
     * @param plugin - The MyAnimeNotes plugin instance.
     */
    constructor(app: App, plugin: MyAnimeNotesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
        // Initialize template state with a callback to refresh the display
        this.templateState = createTemplateSettingsState(() => this.display());
    }

    /**
     * Renders the settings view.
     *
     * This method is called by Obsidian when the user opens the settings tab.
     * It clears the existing container and rebuilds all setting components
     * (Authentication, Templates, Sync options, etc.).
     */
    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // 1. Render MyAnimeList Authentication Settings (Client ID, Secret, Login/Logout)
        this.renderMALSettings(containerEl);

        // 2. Render Template Section
        // Handled by a separate helper function due to the complexity of the template UI
        renderTemplateSection(containerEl, this.plugin, this.templateState);

        // 3. General Settings

        // Notifications Toggle
        new Setting(containerEl)
            .setName("Notifications")
            .setDesc("Notifications from the plugin.")
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.notificationsEnabled)
                    .onChange(async value => {
                        this.plugin.settings.notificationsEnabled = value;
                        await this.plugin.saveSettings();
                        // Update the global notification utility state
                        setNotificationsEnabled(value);
                    })
            );

        // Scheduled Sync Toggle
        new Setting(containerEl)
            .setName("Scheduled sync")
            .setDesc("Automatically sync at regular intervals.")
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.scheduledSync)
                    .onChange(async value => {
                        this.plugin.settings.scheduledSync = value;
                        await this.plugin.saveSettings();

                        // Side Effect: Restart auto-sync manager to apply changes immediately
                        if (this.plugin.autoSyncManager) {
                            this.plugin.autoSyncManager.stop();
                            this.plugin.autoSyncManager.start();
                        }

                        // Refresh UI to show/hide the "Sync interval" input below
                        this.display();
                    })
            );

        // Scheduled Sync Interval (Conditional Render)
        // Only visible if scheduled sync is enabled
        if (this.plugin.settings.scheduledSync) {
            new Setting(containerEl)
                .setName("Sync interval")
                .setDesc(
                    "Time between automatic syncs in minutes (minimum 60)."
                )
                .addText(text =>
                    text
                        .setPlaceholder("90")
                        .setValue(
                            String(this.plugin.settings.scheduledSyncInterval)
                        )
                        .onChange(async value => {
                            const numValue = parseInt(value);
                            // Enforce minimum interval of 60 minutes to respect API rate limits
                            if (!isNaN(numValue) && numValue >= 60) {
                                this.plugin.settings.scheduledSyncInterval =
                                    numValue;
                                await this.plugin.saveSettings();

                                // Restart manager to apply new interval
                                if (this.plugin.autoSyncManager) {
                                    this.plugin.autoSyncManager.stop();
                                    this.plugin.autoSyncManager.start();
                                }
                            }
                        })
                );
        }

        // Sync on Startup Toggle
        new Setting(containerEl)
            .setName("Sync after startup")
            .setDesc("Automatically sync shortly after Obsidian starts.")
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.syncOnLoad)
                    .onChange(async value => {
                        this.plugin.settings.syncOnLoad = value;
                        await this.plugin.saveSettings();

                        // Restart manager to update config
                        if (this.plugin.autoSyncManager) {
                            this.plugin.autoSyncManager.stop();
                            this.plugin.autoSyncManager.start();
                        }
                    })
            );

        // Optimization Toggle
        new Setting(containerEl)
            .setName("Efficient auto-sync")
            .setDesc(
                "Reduce API requests by only auto-syncing watching and reading items."
            )
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.optimizeAutoSync)
                    .onChange(async value => {
                        this.plugin.settings.optimizeAutoSync = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Force Full Sync Toggle
        new Setting(containerEl)
            .setName("Ignore timestamps")
            .setDesc("Skip the timestamp check and update every file.")
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.forceFullSync)
                    .onChange(async value => {
                        this.plugin.settings.forceFullSync = value;
                        await this.plugin.saveSettings();
                    })
            );

        // Debug Mode Toggle
        new Setting(containerEl)
            .setName("Debug mode")
            .setDesc("Enable detailed console logging.")
            .addToggle(toggle =>
                toggle
                    .setValue(this.plugin.settings.debugMode)
                    .onChange(async value => {
                        this.plugin.settings.debugMode = value;
                        await this.plugin.saveSettings();
                        // Update logger state immediately
                        logger.setDebugMode(value);
                    })
            );
    }

    /**
     * Renders the MyAnimeList specific authentication settings.
     *
     * This method dynamically switches between two views:
     * 1. Authenticated: Displays user avatar, name, and logout button.
     * 2. Unauthenticated: Displays Client ID/Secret inputs and Authenticate button.
     * * @param container - The HTML element to append the settings to.
     */
    private renderMALSettings(container: HTMLElement): void {
        const isAuth = isMALAuthenticated(this.plugin);
        const userInfo = this.plugin.settings.malUserInfo;

        // === View 1: Authenticated State ===
        if (isAuth) {
            const userSetting = new Setting(container);

            // Create a custom flex container for avatar, name, and Logout button
            const userInfoContainer = userSetting.controlEl.createDiv({
                cls: "myanimenotes-user-info-wrapper"
            });

            // Left side container: avatar and name
            const userDetailsContainer = userInfoContainer.createDiv({
                cls: "myanimenotes-user-details"
            });

            if (userInfo) {
                //  User info exists. Render avatar and name.
                if (userInfo.picture) {
                    userDetailsContainer.createEl("img", {
                        cls: "myanimenotes-user-avatar",
                        attr: {
                            src: userInfo.picture,
                            alt: userInfo.name
                        }
                    });
                }

                const usernameLink = userDetailsContainer.createEl("a", {
                    cls: "myanimenotes-user-name",
                    text: userInfo.name,
                    href: `https://myanimelist.net/profile/${userInfo.name}`
                });

                usernameLink.addEventListener("click", e => {
                    e.preventDefault();
                    const profileUrl = `https://myanimelist.net/profile/${userInfo.name}`;
                    window.open(profileUrl, "_blank");
                });
            } else {
                // Edge Case: Authenticated but missing User Info
                const retryBtn = userDetailsContainer.createEl("button", {
                    cls: "myanimenotes-logout-button",
                    text: "Refresh profile"
                });

                retryBtn.addEventListener("click", () => {
                    void (async () => {
                        retryBtn.textContent = "Loading...";
                        retryBtn.disabled = true;

                        try {
                            await fetchUserInfo(this.plugin);
                            showNotice("User info updated!", "success");
                            this.display();
                        } catch {
                            showNotice("Failed to fetch info.");
                            retryBtn.textContent = "Refresh profile";
                            retryBtn.disabled = false;
                        }
                    })();
                });
            }

            // Right side container: Logout button
            const buttonContainer = userInfoContainer.createDiv({
                cls: "myanimenotes-button-container"
            });

            const logoutButton = buttonContainer.createEl("button", {
                cls: "myanimenotes-logout-button mod-warning",
                text: "Log out"
            });

            logoutButton.addEventListener("click", () => {
                void (async () => {
                    await malLogout(this.plugin);
                    this.display();
                })();
            });
        }

        // === View 2: Unauthenticated State ===
        if (!isAuth) {
            new Setting(container)
                .setName("Client ID")
                .setDesc("Your myanimelist client ID.")
                .addText(text =>
                    text
                        .setPlaceholder("Enter client ID")
                        .setValue(this.plugin.settings.malClientId)
                        .onChange(async value => {
                            this.plugin.settings.malClientId = value.trim();
                            await this.plugin.saveSettings();
                        })
                );

            new Setting(container)
                .setName("Client secret")
                .setDesc("Your myanimelist client secret.")
                .addText(text => {
                    text.setPlaceholder("Enter client secret")
                        .setValue(this.plugin.settings.malClientSecret || "")
                        .onChange(async value => {
                            this.plugin.settings.malClientSecret = value.trim();
                            await this.plugin.saveSettings();
                        });
                    text.inputEl.type = "password";
                    return text;
                });

            const authSetting = new Setting(container)
                .setName("Authenticate")
                .addButton(button => {
                    button
                        .setButtonText("Authenticate")
                        .setCta()
                        .onClick(async () => {
                            await startMALAuth(this.plugin);
                            this.display();
                        });
                });

            const descEl = authSetting.descEl;
            descEl.createSpan({
                text: "Link your myanimelist account. "
            });
            descEl
                .createEl("a", {
                    text: "Learn more",
                    href: "https://github.com/zara-kasi/obsidian-myanimenotes/blob/main/docs/mal-authentication-guide.md"
                })
                .addEventListener("click", e => {
                    e.preventDefault();
                    const docUrl =
                        "https://github.com/zara-kasi/obsidian-myanimenotes/blob/main/docs/mal-authentication-guide.md";
                    window.open(docUrl, "_blank");
                });
        }
    }
}
