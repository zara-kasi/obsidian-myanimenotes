import { Component } from "obsidian";
import type MyAnimeNotesPlugin from "../../main";
import { log, type Logger } from "../../utils";
import { AUTO_SYNC_CONSTANTS } from "./constants";

/**
 * Manages auto-sync timers (Sync on Load & Scheduled Sync)
 */

export class AutoSyncManager extends Component {
    private plugin: MyAnimeNotesPlugin;
    private syncOnLoadTimer: number | null = null;
    private scheduledSyncTimer: number | null = null;
    private debug: Logger;

    constructor(plugin: MyAnimeNotesPlugin) {
        super();
        this.plugin = plugin;
        this.debug = log.createSub("AutoSync");
    }
    /**
     * Starts all enabled auto-sync timers
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
     * Stops all auto-sync timers manually
     */
    public stop(): void {
        this.clearSyncOnLoadTimer();
        this.clearScheduledSyncTimer();
    }

    /**
     * Checks if enough time has passed since last sync
     */
    private hasMinimumIntervalPassed(): boolean {
        const { lastSuccessfulSync } = this.plugin.settings;
        const { MIN_SCHEDULED_INTERVAL, MS_PER_MINUTE } = AUTO_SYNC_CONSTANTS;

        // If never synced, allow it
        if (!lastSuccessfulSync) {
            this.debug.info("No previous sync found - allowing sync");

            return true;
        }

        const now = Date.now();
        const timeSinceLastSync = now - lastSuccessfulSync;
        const minimumIntervalMs = MIN_SCHEDULED_INTERVAL * MS_PER_MINUTE;

        const hasPassed = timeSinceLastSync >= minimumIntervalMs;

        if (!hasPassed) {
            const minutesSince = Math.floor(timeSinceLastSync / MS_PER_MINUTE);
            const remaining = MIN_SCHEDULED_INTERVAL - minutesSince;
            this.debug.info(
                `Minimum interval not met: ${minutesSince}m since last sync. Wait ${remaining}m.`
            );
        }

        return hasPassed;
    }

    /**
     * Starts the one-time sync after plugin load
     */
    private startSyncOnLoad(): void {
        this.clearSyncOnLoadTimer();

        if (!this.isAuthenticated()) {
            this.debug.warn("Skipped: Not authenticated");

            return;
        }

        const { SYNC_ON_LOAD_DELAY } = AUTO_SYNC_CONSTANTS;
        this.debug.info(
            `Timer started: Will sync in ${
                AUTO_SYNC_CONSTANTS.SYNC_ON_LOAD_DELAY / 60000
            } minutes`
        );

        this.syncOnLoadTimer = window.setTimeout(() => {
            void this.executeSync("Sync on Load", true); // true = check minimum interval
        }, SYNC_ON_LOAD_DELAY);

        this.plugin.registerInterval(this.syncOnLoadTimer);
    }

    /**
     * Starts the recurring scheduled sync
     */
    private startScheduledSync(): void {
        this.clearScheduledSyncTimer();

        if (!this.isAuthenticated()) {
            this.debug.warn("Skipped: Not authenticated");
            return;
        }

        const { MIN_SCHEDULED_INTERVAL, MS_PER_MINUTE } = AUTO_SYNC_CONSTANTS;

        // Ensure we don't go below the minimum
        const intervalMinutes = Math.max(
            this.plugin.settings.scheduledSyncInterval,
            MIN_SCHEDULED_INTERVAL
        );
        const intervalMs = intervalMinutes * MS_PER_MINUTE;

        this.debug.info(`Timer started: Every ${intervalMinutes} minutes`);

        this.scheduledSyncTimer = window.setInterval(() => {
            void this.executeSync("Scheduled Sync", false); // false = ignore minimum interval (schedule is explicit)
        }, intervalMs);

        this.plugin.registerInterval(this.scheduledSyncTimer);
    }

    /**
     * Common execution logic for both sync types
     */
    private async executeSync(
        source: string,
        checkMinInterval: boolean
    ): Promise<void> {
        this.debug.info(`[${source}] Triggered`);

        if (!this.isAuthenticated()) {
            this.debug.warn(`[${source}] Aborted: Auth lost`);

            if (source === "Scheduled Sync") this.stop();
            return;
        }

        if (checkMinInterval && !this.hasMinimumIntervalPassed()) {
            this.debug.info(`[${source}] Aborted: Too soon`);

            if (source === "Sync on Load") this.clearSyncOnLoadTimer();
            return;
        }

        try {
            if (this.plugin.syncManager) {
                if (this.plugin.settings.optimizeAutoSync) {
                    await this.plugin.syncManager.syncActiveStatuses();
                } else {
                    await this.plugin.syncManager.syncFromMAL();
                }
                this.debug.info(`[${source}] Completed successfully`);
            }
        } catch (error) {
            this.debug.error(`[${source}] Failed:`, error);
        } finally {
            // Cleanup one-time timers
            if (source === "Sync on Load") {
                this.clearSyncOnLoadTimer();
            }
        }
    }

    private isAuthenticated(): boolean {
        return !!(
            this.plugin.settings.malAuthenticated &&
            this.plugin.settings.malAccessToken
        );
    }

    private clearSyncOnLoadTimer(): void {
        if (this.syncOnLoadTimer !== null) {
            window.clearTimeout(this.syncOnLoadTimer);
            this.syncOnLoadTimer = null;
        }
    }

    private clearScheduledSyncTimer(): void {
        if (this.scheduledSyncTimer !== null) {
            window.clearInterval(this.scheduledSyncTimer);
            this.scheduledSyncTimer = null;
        }
    }
}
