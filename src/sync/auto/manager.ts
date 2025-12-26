import { Component } from "obsidian";
import type MyAnimeNotesPlugin from "../../main";
import { logger } from "../../utils/logger";
import { AUTO_SYNC_CONSTANTS } from "./constants";

const log = new logger("AutoSyncManager");

/**
 * Manages automated synchronization tasks for the plugin.
 *
 * This component handles two specific types of automation:
 * 1. **Sync on Load:** A one-time sync that runs shortly after Obsidian starts.
 * 2. **Scheduled Sync:** A recurring background sync that runs at user-defined intervals.
 *
 * It extends Obsidian's `Component` to ensure proper lifecycle management (unloading timers).
 */
export class AutoSyncManager extends Component {
    private plugin: MyAnimeNotesPlugin;
    private syncOnLoadTimer: number | null = null;
    private scheduledSyncTimer: number | null = null;

    constructor(plugin: MyAnimeNotesPlugin) {
        super();
        this.plugin = plugin;
    }

    /**
     * Initializes and starts all enabled auto-sync timers based on current settings.
     * Called by the main plugin `onload`.
     */
    public start(): void {
        if (this.plugin.settings.syncOnLoad) {
            this.startSyncOnLoad();
        }

        if (this.plugin.settings.scheduledSync) {
            this.startScheduledSync();
        }
    }

    /**
     * Stops all active auto-sync timers.
     * Called by the main plugin `onunload` or when settings are disabled.
     */
    public stop(): void {
        this.clearSyncOnLoadTimer();
        this.clearScheduledSyncTimer();
    }

    /**
     * Validates if enough time has passed since the last successful sync
     * to prevent API spamming (e.g., if the user restarts Obsidian frequently).
     *
     * @returns `true` if the minimum cooldown interval has passed or if no previous sync exists.
     */
    private hasMinimumIntervalPassed(): boolean {
        const { lastSuccessfulSync } = this.plugin.settings;
        const { MIN_SCHEDULED_INTERVAL, MS_PER_MINUTE } = AUTO_SYNC_CONSTANTS;

        // If never synced, allow it immediately
        if (!lastSuccessfulSync) {
            log.debug("No previous sync found - allowing sync");

            return true;
        }

        const now = Date.now();
        const timeSinceLastSync = now - lastSuccessfulSync;
        const minimumIntervalMs = MIN_SCHEDULED_INTERVAL * MS_PER_MINUTE;

        const hasPassed = timeSinceLastSync >= minimumIntervalMs;

        if (!hasPassed) {
            const minutesSince = Math.floor(timeSinceLastSync / MS_PER_MINUTE);
            const remaining = MIN_SCHEDULED_INTERVAL - minutesSince;
            log.debug(
                `Minimum interval not met: ${minutesSince}m since last sync. Wait ${remaining}m.`
            );
        }

        return hasPassed;
    }

    /**
     * Schedules the one-time "Sync on Load" task.
     * Delays execution by `SYNC_ON_LOAD_DELAY` to avoid slowing down Obsidian's startup.
     */
    private startSyncOnLoad(): void {
        this.clearSyncOnLoadTimer();

        if (!this.isAuthenticated()) {
            log.error("Skipped: Not authenticated");

            return;
        }

        const { SYNC_ON_LOAD_DELAY } = AUTO_SYNC_CONSTANTS;
        log.debug(
            `Timer started: Will sync in ${
                AUTO_SYNC_CONSTANTS.SYNC_ON_LOAD_DELAY / 60000
            } minutes`
        );

        // Sets a one-time timer
        this.syncOnLoadTimer = window.setTimeout(() => {
            void this.executeSync("Sync on Load", true); // true = check minimum interval to prevent spam
        }, SYNC_ON_LOAD_DELAY);

        // Register with Obsidian's component manager for auto-cleanup
        this.plugin.registerInterval(this.syncOnLoadTimer);
    }

    /**
     * Schedules the recurring "Scheduled Sync" task.
     * Runs every `scheduledSyncInterval` minutes.
     */
    private startScheduledSync(): void {
        this.clearScheduledSyncTimer();

        if (!this.isAuthenticated()) {
            log.debug("Skipped: Not authenticated");
            return;
        }

        const { MIN_SCHEDULED_INTERVAL, MS_PER_MINUTE } = AUTO_SYNC_CONSTANTS;

        // Ensure we don't go below the hardcoded minimum to protect API limits
        const intervalMinutes = Math.max(
            this.plugin.settings.scheduledSyncInterval,
            MIN_SCHEDULED_INTERVAL
        );
        const intervalMs = intervalMinutes * MS_PER_MINUTE;

        log.debug(`Timer started: Every ${intervalMinutes} minutes`);

        // Sets a recurring timer
        this.scheduledSyncTimer = window.setInterval(() => {
            void this.executeSync("Scheduled Sync", false); // false = ignore minimum interval (user explicitly requested this schedule)
        }, intervalMs);

        // Register with Obsidian's component manager for auto-cleanup
        this.plugin.registerInterval(this.scheduledSyncTimer);
    }

    /**
     * The core execution logic used by both sync triggers.
     *
     * @param source - Label for logging (e.g., "Sync on Load").
     * @param checkMinInterval - Whether to enforce the minimum cooldown check.
     */
    private async executeSync(
        source: string,
        checkMinInterval: boolean
    ): Promise<void> {
        log.debug(`[${source}] Triggered`);

        // 1. Check Authentication
        if (!this.isAuthenticated()) {
            log.error(`[${source}] Aborted: Auth lost`);

            // If auth is lost, stop trying to schedule syncs
            if (source === "Scheduled Sync") this.stop();
            return;
        }

        // 2. Check Cooldown (if required)
        if (checkMinInterval && !this.hasMinimumIntervalPassed()) {
            log.debug(`[${source}] Aborted: Too soon`);

            if (source === "Sync on Load") this.clearSyncOnLoadTimer();
            return;
        }

        try {
            if (this.plugin.syncManager) {
                // 3. Execute Sync based on optimization settings
                if (this.plugin.settings.optimizeAutoSync) {
                    // Optimized: Only fetch "Watching/Reading" items to save bandwidth/API calls
                    await this.plugin.syncManager.syncActiveStatuses();
                } else {
                    // Full: Fetch everything
                    await this.plugin.syncManager.syncFromMAL();
                }
                log.debug(`[${source}] Completed successfully`);
            }
        } catch (error) {
            log.error(`[${source}] Failed:`, error);
        } finally {
            // Cleanup one-time timers to prevent hanging references
            if (source === "Sync on Load") {
                this.clearSyncOnLoadTimer();
            }
        }
    }

    /**
     * Checks if the user is fully authenticated with MAL.
     */
    private isAuthenticated(): boolean {
        return !!(
            this.plugin.settings.malAuthenticated &&
            this.plugin.settings.malAccessToken
        );
    }

    /**
     * Clears the one-time "Sync on Load" timer.
     */
    private clearSyncOnLoadTimer(): void {
        if (this.syncOnLoadTimer !== null) {
            window.clearTimeout(this.syncOnLoadTimer);
            this.syncOnLoadTimer = null;
        }
    }

    /**
     * Clears the recurring "Scheduled Sync" timer.
     */
    private clearScheduledSyncTimer(): void {
        if (this.scheduledSyncTimer !== null) {
            window.clearInterval(this.scheduledSyncTimer);
            this.scheduledSyncTimer = null;
        }
    }
}
