import { moment } from "obsidian";

export class logger {
    private static isDebugMode = false;
    private static readonly PREFIX = "MyAnimeNotes";
    private readonly context: string;

    /**
     * Create a named logger instance.
     * @param context The feature/file name (e.g., "Sync", "Main")
     */
    constructor(context: string) {
        this.context = context;
    }

    /**
     * Global switch to enable/disable logs.
     * Sync this with your settings in main.ts
     */
    static setDebugMode(enabled: boolean): void {
        logger.isDebugMode = enabled;
    }

    /**
     * DEBUG: Use for all standard logs (verbose data, state changes, warnings).
     * Maps to console.debug.
     * Only visible if Debug Mode is ON.
     */
    debug(message: string, ...objects: unknown[]): void {
        if (logger.isDebugMode) this.print("debug", message, ...objects);
    }

    /**
     * ERROR: Use for critical failures.
     * Maps to console.error.
     * ALWAYS visible (Critical failures should not be hidden).
     */
    error(message: string, ...objects: unknown[]): void {
        this.print("error", message, ...objects);
    }

    private print(
        level: "debug" | "error",
        message: string,
        ...objects: unknown[]
    ): void {
        const timestamp = moment().format("HH:mm:ss");
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
