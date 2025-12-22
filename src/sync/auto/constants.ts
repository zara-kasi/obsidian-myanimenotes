export const AUTO_SYNC_CONSTANTS = {
    SYNC_ON_LOAD_DELAY: 2 * 60 * 1000,    // 2 minutes (non-blocking start)
    MIN_SCHEDULED_INTERVAL: 60,           // Minimum 60 minutes allowed
    MS_PER_MINUTE: 60 * 1000              // Helper for calculations
} as const;
