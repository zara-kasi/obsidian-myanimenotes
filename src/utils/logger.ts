import type { MyAnimeNotesSettings } from "../settings";

/**
 * Log levels to control verbosity.
 * NONE allows disabling all non-critical logs.
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    NONE = 99
}

/**
 * Internal global state for the logger.
 * We use a global state so that all Logger instances (including child loggers)
 * instantly respect setting changes without needing to be re-instantiated.
 */
let currentConfig = {
    isDebugMode: false,
    minLevel: LogLevel.DEBUG
};

/**
 * Updates the global logger configuration based on plugin settings.
 * This should be called in `main.ts` (onload) and `tab.ts` (when settings change).
 * * @param settings The current plugin settings
 */
export function configureLogger(settings: MyAnimeNotesSettings): void {
    currentConfig.isDebugMode = settings.debugMode;
    // If debug mode is OFF, we switch level to NONE (or ERROR if you prefer)
    // to strictly prevent console noise as per Obsidian guidelines.
    currentConfig.minLevel = settings.debugMode
        ? LogLevel.DEBUG
        : LogLevel.NONE;
}

/**
 * A robust logger utility that supports namespaces and log levels.
 * It wraps console methods to ensure logs are only shown when "Debug Mode" is enabled.
 */
export class Logger {
    constructor(private readonly prefix: string = "MyAnimeNotes") {}

    /**
     * Creates a child logger with an extended prefix.
     * Useful for tracking logs from specific modules (e.g., "[MyAnimeNotes:Sync]").
     * * @param namespace The sub-module name
     */
    public createSub(namespace: string): Logger {
        return new Logger(`${this.prefix}:${namespace}`);
    }

    /**
     * Formats the message with the standard prefix.
     */
    private format(msg: string): string {
        return `[${this.prefix}] ${msg}`;
    }

    /**
     * Checks if the message should be logged based on the current global config.
     */
    private shouldLog(level: LogLevel): boolean {
        return currentConfig.isDebugMode && level >= currentConfig.minLevel;
    }

    /**
     * Log detailed development information.
     * Maps to `console.debug`.
     */
    public debug(msg: string, ...args: unknown[]): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(this.format(msg), ...args);
        }
    }

    /**
     * Log general operational events (e.g., "Sync completed").
     * Maps to `console.info`.
     * * NOTE: We disable the 'no-console' lint rule here because we strictly
     * guard this call with `if (shouldLog)`. It will NEVER spam the console
     * unless the user explicitly enables Debug Mode.
     */
    public info(msg: string, ...args: unknown[]): void {
        if (this.shouldLog(LogLevel.INFO)) {
            // eslint-disable-next-line no-console
            console.info(this.format(msg), ...args);
        }
    }

    /**
     * Log non-critical warnings.
     * Maps to `console.warn` (Yellow text).
     */
    public warn(msg: string, ...args: unknown[]): void {
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(this.format(msg), ...args);
        }
    }

    /**
     * Log critical errors.
     * Maps to `console.error` (Red text).
     * Errors are typically allowed even in production, but here they also
     * respect the debug settings logic if needed.
     */
    public error(msg: string, ...args: unknown[]): void {
        console.error(this.format(msg), ...args);
    }
}

/**
 * The default global logger instance.
 * Import `log` to use logging anywhere in the app.
 */
export const log = new Logger();
