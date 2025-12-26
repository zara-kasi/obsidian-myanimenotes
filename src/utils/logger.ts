import { moment } from "obsidian";

/**
 * A utility class for consistent logging across the MyAnimeNotes plugin.
 *
 * This wrapper handles:
 * - Standardized formatting with timestamps and context prefixes.
 * - Global debug mode toggling (syncs with plugin settings).
 * - Distinguishing between debug info (conditional) and errors (always visible).
 */
export class logger {
    /**
     * Global switch to control log verbosity.
     * When false, `debug()` calls are suppressed.
     */
    private static isDebugMode = false;

    /**
     * The standard prefix applied to all logs from this plugin for easy filtering.
     */
    private static readonly PREFIX = "MyAnimeNotes";

    /**
     * The specific context for this logger instance (e.g., "Sync", "Auth").
     * Helps identify which part of the system generated the log.
     */
    private readonly context: string;

    /**
     * Create a named logger instance.
     *
     * @param context The feature/file name (e.g., "Sync", "Main")
     */
    constructor(context: string) {
        this.context = context;
    }

    /**
     * Global switch to enable/disable logs.
     * This should be called whenever the user changes the 'Debug Mode' setting.
     *
     * @param enabled - Whether debug logs should be visible in the console.
     */
    static setDebugMode(enabled: boolean): void {
        logger.isDebugMode = enabled;
    }

    /**
     * DEBUG: Use for standard logs (verbose data, state changes, warnings).
     * Maps to `console.debug`.
     *
     * Behavior:
     * - Only prints if `setDebugMode(true)` has been called.
     * - Use this for development info that shouldn't clutter the user's console by default.
     *
     * @param message - The log message.
     * @param objects - Optional objects/data to inspect.
     */
    debug(message: string, ...objects: unknown[]): void {
        if (logger.isDebugMode) this.print("debug", message, ...objects);
    }

    /**
     * ERROR: Use for critical failures or unexpected exceptions.
     * Maps to `console.error`.
     *
     * Behavior:
     * - ALWAYS visible, ignoring the debug mode setting.
     * - Critical failures should never be silenced.
     *
     * @param message - The error description.
     * @param objects - Optional objects/errors (e.g., the Error object itself).
     */
    error(message: string, ...objects: unknown[]): void {
        this.print("error", message, ...objects);
    }

    /**
     * Internal helper to format and output the log message.
     *
     * Format: `[HH:mm:ss] [MyAnimeNotes] [Context] Message`
     *
     * @param level - The console level ("debug" or "error").
     * @param message - The text message.
     * @param objects - Additional arguments to pass to the console.
     */
    private print(
        level: "debug" | "error",
        message: string,
        ...objects: unknown[]
    ): void {
        const timestamp = moment().format("HH:mm:ss");
        // Construct the standardized log prefix
        const prefix = `[${timestamp}] [${logger.PREFIX}] [${this.context}]`;
        const formattedMsg = `${prefix} ${message}`;

        switch (level) {
            case "debug":
                console.debug(formattedMsg, ...objects);
                break;
            case "error":
                console.error(formattedMsg, ...objects);
                break;
        }
    }
}
