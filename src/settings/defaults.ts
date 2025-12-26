import type { MyAnimeNotesSettings } from './types';

/**
 * The default configuration settings for the MyAnimeNotes plugin.
 * * These values are used when the plugin is first installed or when
 * specific settings have not yet been configured by the user.
 */
export const DEFAULT_SETTINGS: MyAnimeNotesSettings = {
    // ========================================================================
    // MyAnimeList (MAL) Authentication Defaults
    // ========================================================================
    // Credentials and tokens start empty/null until the user authenticates.
    malClientId: "",
    malClientSecret: "",
    malAccessToken: "",
    malRefreshToken: "",
    malTokenExpiry: null,
    malUserInfo: null,
    malAuthenticated: false,
    malAuthState: null, // Used for PKCE or state validation during auth flow

    // ========================================================================
    // Template System Defaults
    // ========================================================================
    // 'undefined' indicates the internal default template structure should be used
    // until the user customizes the properties via the settings UI.
    animeTemplate: undefined,
    mangaTemplate: undefined,

    // ========================================================================
    // Synchronization Defaults
    // ========================================================================
    // By default, we respect file timestamps to avoid unnecessary writes.
    forceFullSync: false,
    
    // Sync shortly after Obsidian opens to keep data fresh.
    syncOnLoad: true,
    
    // Scheduled background sync is disabled by default to save resources.
    scheduledSync: false,
    
    // Minimum interval is 60 minutes to respect MAL API rate limits.
    scheduledSyncInterval: 60, 
    
    // Tracks the timestamp of the last successful sync operation.
    lastSuccessfulSync: undefined, 
    
    // Optimizes auto-sync by only fetching 'Watching' or 'Reading' items
    // (saves API calls compared to fetching the entire list every time).
    optimizeAutoSync: true,

    // ========================================================================
    // Legacy / Custom Template Defaults
    // ========================================================================
    // Controls for loading an external Markdown file as a template (if supported).
    useCustomTemplate: false,
    customTemplatePath: undefined,

    // ========================================================================
    // UI & Debug Defaults
    // ========================================================================
    // Show Obsidian notices (toast messages) for sync status/errors.
    notificationsEnabled: true,
    
    // verbose logging disabled by default for performance.
    debugMode: false
};
