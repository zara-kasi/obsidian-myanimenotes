import type { MALUserInfo } from "../auth";
import type { TemplateConfig } from "./template";

export interface MyAnimeNotesSettings {
    // MAL Authentication
    malClientId: string;
    malClientSecret?: string;
    malAccessToken?: string;
    malRefreshToken?: string;
    malTokenExpiry?: number | null;
    malUserInfo?: MALUserInfo | null;
    malAuthenticated: boolean;

    // OAuth flow state (temporary, cleared after auth completes)
    malAuthState?: {
        verifier: string;
        state: string;
        timestamp: number; // For expiry checking
    } | null;
    // Advanced API settings
    apiMaxRetries?: number;
    apiRetryDelay?: number;

    // Template System
    animeTemplate?: TemplateConfig;
    mangaTemplate?: TemplateConfig;

    // Sync Settings
    forceFullSync: boolean;
    syncOnLoad: boolean; // Sync shortly after plugin loads (3 seconds)
    scheduledSync: boolean; // Periodic scheduled sync
    scheduledSyncInterval: number; // Interval in minutes (min: 60)
    lastSuccessfulSync?: number; // Timestamp of last successful sync
    optimizeAutoSync: boolean; // Only sync active statuses during auto-sync

    // Template Settings (for future use)
    useCustomTemplate: boolean;
    customTemplatePath?: string;
    notificationsEnabled: boolean; // Enable/disable user notifications
    // Debug Settings
    debugMode: boolean;
}

