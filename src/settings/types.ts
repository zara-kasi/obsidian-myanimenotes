import type { MALUserInfo } from "../auth";
import type { TemplateConfig } from "./template";

/**
 * Interface defining the structure of the plugin's settings.
 * * This interface is used to persist user configuration, authentication tokens,
 * and internal state (like the last sync timestamp) to the `data.json` file.
 */
export interface MyAnimeNotesSettings {
    // ========================================================================
    // MAL Authentication
    // ========================================================================
    
    /** The Client ID for the MyAnimeList API application. */
    malClientId: string;

    /** * The Client Secret for the MyAnimeList API application. 
     * @remarks This is optional because public clients might not need it, 
     * but standard web flows usually do.
     */
    malClientSecret?: string;

    /** The current access token for authenticating API requests. */
    malAccessToken?: string;

    /** The refresh token used to obtain a new access token when the current one expires. */
    malRefreshToken?: string;

    /** * The timestamp (in milliseconds) when the current access token expires.
     * Used to proactively refresh the token before making requests.
     */
    malTokenExpiry?: number | null;

    /** Cached user profile information (name, avatar, etc.) for display in the settings UI. */
    malUserInfo?: MALUserInfo | null;

    /** Flag indicating if the user has successfully completed the authentication flow. */
    malAuthenticated: boolean;

    /**
     * Temporary state used during the OAuth PKCE (Proof Key for Code Exchange) flow.
     * This ensures security by verifying that the auth response belongs to the request.
     * @remarks This is cleared automatically after authentication completes.
     */
    malAuthState?: {
        /** The code verifier string generated for PKCE. */
        verifier: string;
        /** The unique state string to prevent CSRF attacks. */
        state: string;
        /** Timestamp of when the auth flow started, used for timeout checks. */
        timestamp: number; 
    } | null;

    // ========================================================================
    // Template System
    // ========================================================================
    
    /** Configuration for the generated Anime notes (frontmatter, content, etc.). */
    animeTemplate?: TemplateConfig;

    /** Configuration for the generated Manga notes (frontmatter, content, etc.). */
    mangaTemplate?: TemplateConfig;

    // ========================================================================
    // Sync Settings
    // ========================================================================

    /** * If true, ignores the local file modification times and overwrites 
     * all notes during sync. Useful for applying template changes to existing notes.
     */
    forceFullSync: boolean;

    /** * If true, triggers a sync shortly after the plugin (and Obsidian) loads. 
     * Usually set to a 3-second delay to avoid blocking startup.
     */
    syncOnLoad: boolean; 

    /** If true, enables the background timer for automatic synchronization. */
    scheduledSync: boolean; 

    /** * The interval in minutes between automatic syncs.
     * @defaultValue 60
     * @remarks Minimum is strictly enforced to 60 minutes to respect API limits.
     */
    scheduledSyncInterval: number; 

    /** Timestamp (ms) of the last time a sync successfully completed. */
    lastSuccessfulSync?: number; 

    /** * If true, auto-sync only fetches items with "Watching" or "Reading" status.
     * This significantly reduces API overhead for frequent background updates.
     */
    optimizeAutoSync: boolean; 

    // ========================================================================
    // Legacy / Future Template Settings
    // ========================================================================
    
    /** @deprecated / Reserved for future use: Toggle for using an external MD file as template. */
    useCustomTemplate: boolean;
    
    /** @deprecated / Reserved for future use: File path to the external template. */
    customTemplatePath?: string;

    // ========================================================================
    // UI & Debug Settings
    // ========================================================================

    /** Controls whether toast notifications appear for sync events. */
    notificationsEnabled: boolean; 
    
    /** Controls verbose logging to the developer console. */
    debugMode: boolean;
}
