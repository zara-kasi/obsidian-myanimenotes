import type { MyAnimeNotesSettings } from './types';


export const DEFAULT_SETTINGS: MyAnimeNotesSettings = {
    // MAL defaults
    malClientId: "",
    malClientSecret: "",
    malAccessToken: "",
    malRefreshToken: "",
    malTokenExpiry: null,
    malUserInfo: null,
    malAuthenticated: false,
    malAuthState: null,

    // Template system defaults
    animeTemplate: undefined,
    mangaTemplate: undefined,

    // Sync defaults
    forceFullSync: false,
    syncOnLoad: true,
    scheduledSync: false,
    scheduledSyncInterval: 60, // 60 minutes default
    lastSuccessfulSync: undefined, // No previous sync
    optimizeAutoSync: true,
    // Template defaults
    useCustomTemplate: false,
    customTemplatePath: undefined,
    // Notification defaults
    notificationsEnabled: true,
    // Debug defaults
    debugMode: false
};